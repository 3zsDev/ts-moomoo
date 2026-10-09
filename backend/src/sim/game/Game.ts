import { censor, isRude, sanitize } from "../../../../api/lib/filter.mjs";
import { liveNameBlocked } from "./nameFilter";
import { serverConfig } from "../../config";
import { fetchProfile, reportLife, reportPlayer, type LifeReport, type ReportTarget, type Session } from "../../net/api";
import type { SimClient } from "../client";
import {
  accessories, Animal, AnimalManager, ClientPacket, config, findAccessory, findHat,
  fixTo, GameObject, getDirection, getDistance, hats, itemData, ObjectManager, Player,
  Projectile, ProjectileManager, randInt, ServerPacket,
  type Cosmetic, type Damageable, type MsgPackValue, type ServerHooks,
} from "../../shared";
import { createSimPlugin, type SimHost, type SimPlugin } from "../plugin";
import { canRunAdminCommand, runAdminCommand } from "./admin";
import { arenaBosses } from "./arena";
import { ClanManager } from "./clans";
import { FallsDirector } from "./falls";
import { findSpawnPoint, generateWorld } from "./worldgen";

const deltaSpeed = 1000 / config.serverUpdateRate;
const YETI = 10;
const SPIN_MS = 16;
const LEADERBOARD_INTERVAL = 1000;
const ANON_COOLDOWN = 30000;
const GOLD_INTERVAL = 1000;
const LEADERBOARD_SIZE = 10;
const MAX_CHAT_LENGTH = 30;

function capChatLength(text: string): string {
  return text.length <= MAX_CHAT_LENGTH ? text : text.slice(0, MAX_CHAT_LENGTH).trimEnd();
}

const RESOURCE_KEYS = ["wood", "food", "stone", "points"] as const;

const ANIMAL_KEYS: Record<number, string> = {
  0: "cow", 1: "pig", 2: "bull", 3: "bully", 4: "wolf", 5: "duck", 6: "moostafa",
  7: "treasure", 8: "moofie", 9: "boar", 10: "yeti", 11: "crab_king", 12: "sheep",
};

const ROLE_BADGES = { mod: 1, admin: 2 } as const;

export type ModerationAction = "kick" | "ban" | "shadow" | "clear";

type SpawnBand = "any" | "snow" | "desert" | "grass";

interface ViewState {
  players: Set<number>;
  animals: Set<number>;
}

export class Game implements SimHost {
  public readonly players: Player[] = [];
  public readonly animals: Animal[] = [];
  public readonly gameObjects: GameObject[] = [];
  public readonly projectiles: Projectile[] = [];

  public readonly hooks: ServerHooks = {
    send: (target, packet, ...args) => {
      this.clientFor(target)?.send(packet, ...(args as MsgPackValue[]));
    },
    broadcast: (packet, ...args) => {
      for (const client of this.clientsByPlayer.values()) {
        client.send(packet, ...(args as MsgPackValue[]));
      }
    },
  };

  public readonly objectManager: ObjectManager;
  public readonly projectileManager: ProjectileManager;
  public readonly animalManager: AnimalManager;
  public readonly clans: ClanManager;
  public readonly falls: FallsDirector;

  private readonly clientsByPlayer = new Map<Player, SimClient>();
  private readonly playersByClient = new Map<SimClient, Player>();
  private readonly playersById = new Map<string, Player>();
  private readonly views = new Map<Player, ViewState>();
  private readonly statsTargets = new Map<Player, number>();
  private readonly sessions = new Map<Player, Session>();
  private readonly anonymous = new Set<Player>();
  private readonly anonChangedAt = new Map<Player, number>();
  private readonly lifeStart = new Map<Player, number>();
  private reservedNames = new Set<string>();

  public readonly plugin: SimPlugin;

  private nextSid = 1;
  private nextHeadlessId = 1;
  private lastTick = Date.now();
  private goldTimer = 0;
  private leaderboardTimer = 0;
  private minimapTimer = 0;
  private statsTimer = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private nextTickAt = 0;
  private running = false;
  private spin: ReturnType<typeof setImmediate> | null = null;

  public constructor() {
    this.objectManager = new ObjectManager(
      this.gameObjects, config, this.players as unknown as Damageable[], this.hooks,
    );
    this.projectileManager = new ProjectileManager(
      this.projectiles, this.players as unknown as Damageable[],
      this.animals as unknown as Damageable[], this.objectManager, itemData, config, this.hooks,
    );
    this.animalManager = new AnimalManager(
      this.animals, this.players as unknown as Damageable[], this.objectManager,
      config, this.awardScore, this.hooks,
    );
    this.clans = new ClanManager(this.players, this.hooks);
    this.falls = new FallsDirector(this);

    this.clans.onJoinRequest = (owner, applicant) => {
      this.plugin.onClanRequest(owner, applicant.sid);
    };

    generateWorld(this.objectManager);
    this.spawnWildlife();

    this.plugin = createSimPlugin(this);
  }

  public get playerCount(): number {
    return this.players.length;
  }

  public humanCount(): number {
    return this.clientsByPlayer.size;
  }

  public capacity(): number {
    return config.maxPlayers;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTick = Date.now();
    this.nextTickAt = this.lastTick + deltaSpeed;
    this.scheduleTick();
  }

  public stop(): void {
    this.running = false;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.spin) {
      clearImmediate(this.spin);
      this.spin = null;
    }
  }

  private scheduleTick(): void {
    if (!this.running) return;
    const wait = this.nextTickAt - Date.now();

    if (wait > SPIN_MS) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.scheduleTick();
      }, wait - SPIN_MS);
      return;
    }

    if (wait > 0) {
      this.spin = setImmediate(() => {
        this.spin = null;
        this.scheduleTick();
      });
      return;
    }

    const now = Date.now();
    this.nextTickAt += deltaSpeed;

    if (this.nextTickAt < now) this.nextTickAt = now + deltaSpeed;

    this.tick();
    this.scheduleTick();
  }

  private clientFor(target: string | number): SimClient | undefined {
    const player = typeof target === "number"
      ? this.players.find((candidate) => candidate.sid === target)
      : this.playersById.get(target);

    return player ? this.clientsByPlayer.get(player) : undefined;
  }

  private readonly awardScore = (
    target: Player | Damageable, amount: number, isGold?: boolean,
  ): void => {
    const player = target as Player;
    if (!player?.isPlayer || !amount) return;

    player.points = Math.max(0, Math.round(player.points + amount));
    this.hooks.send(player.id, ServerPacket.UpdatePlayerValue, "points", player.points, 1);

    this.plugin.onIncome(player, amount);

    if (!isGold && amount > 0) player.earnXP(amount);
  };


  private spawnWildlife(): void {
    for (const entry of serverConfig.animals) {
      for (let i = 0; i < entry.count; i++) {
        const [x, y] = this.randomAnimalPoint(entry.band);
        const animal = this.animalManager.spawn(x, y, randInt(0, 628) / 100, entry.type);
        animal.spawnPoint = () => this.randomAnimalPoint(entry.band);
        if (entry.type === YETI) animal.spawnDelay = serverConfig.yetiRespawn;
      }
    }

    this.falls.spawn();

    for (const boss of arenaBosses) {
      const dir = boss.dir ?? randInt(0, 628) / 100;
      this.animalManager.spawn(boss.x, boss.y, dir, boss.type);
    }
  }

  private randomAnimalPoint(band: SpawnBand): [number, number] {
    const x = randInt(200, config.mapScale - 200);
    const desertTop = config.mapScale - config.snowBiomeTop;

    switch (band) {
      case "snow": return [x, randInt(200, config.snowBiomeTop - 200)];
      case "desert": return [x, randInt(desertTop + 200, config.mapScale - 200)];
      case "grass": return [x, randInt(config.snowBiomeTop + 200, desertTop - 200)];
      default: return [x, randInt(200, config.mapScale - 200)];
    }
  }

  public addClient(client: SimClient, session: Session): boolean {
    if (this.humanCount() >= this.capacity() && !this.isStaff(session)) {
      this.turnAway(client, "server is full");
      return false;
    }
    if (serverConfig.membersOnly && !session.account) {
      this.turnAway(client, "Sign in to play on this server");
      return false;
    }

    while (this.players.length >= this.capacity() && this.plugin.makeRoom()) {
      // a seat opened up
    }

    const id = `p${client.socketId}`;
    const sid = this.nextSid++;

    const player: Player = new Player(
      id, sid, config, this.projectileManager, this.objectManager,
      this.players, this.animals as unknown as Damageable[], itemData, hats, accessories,
      this.awardScore, this.hooks, () => this.handleDeath(player),
    );

    this.players.push(player);
    this.playersById.set(id, player);
    this.clientsByPlayer.set(player, client);
    this.playersByClient.set(client, player);
    this.views.set(player, { players: new Set(), animals: new Set() });
    this.sessions.set(player, session);
    player.member = Boolean(session.account);

    client.onPacket = (type, args) => this.handlePacket(client, player, type, args);
    client.onClose = () => this.removeClient(client);
    return true;
  }

  public turnAway(client: SimClient, reason: string): void {
    client.send(ServerPacket.Disconnect, reason);
    client.close(4001, reason);
  }

  private isStaff(session: Session | undefined): boolean {
    return session?.account?.role === "admin" || session?.account?.role === "mod";
  }

  public removeClient(client: SimClient): void {
    const player = this.playersByClient.get(client);
    if (!player) return;

    if (player.alive) this.submitLife(player, false);
    this.sessions.delete(player);
    this.anonymous.delete(player);
    this.anonChangedAt.delete(player);

    this.clans.remove(player);
    this.objectManager.removeAllItems(player.sid, this.hooks);

    player.alive = false;
    player.active = false;

    this.clientsByPlayer.delete(player);
    this.playersByClient.delete(client);
    this.playersById.delete(player.id);
    this.views.delete(player);
    this.statsTargets.delete(player);
    this.falls.forgetPlayer(player.sid);

    const index = this.players.indexOf(player);
    if (index >= 0) this.players.splice(index, 1);

    this.hooks.broadcast(ServerPacket.RemovePlayer, player.id);
  }

  private handleDeath(player: Player): void {
    this.submitLife(player, true);
  }

  private submitLife(player: Player, died: boolean): void {
    const start = this.lifeStart.get(player);
    this.lifeStart.delete(player);
    const account = this.sessions.get(player)?.account;
    if (!account || start === undefined || serverConfig.sandbox) return;

    const stats = player.stats;
    const animalKills: Record<string, number> = {};
    for (const [index, count] of Object.entries(stats.animalKills)) {
      const key = ANIMAL_KEYS[Number(index)];
      if (key) animalKills[key] = (animalKills[key] ?? 0) + count;
    }

    reportLife({
      account: account.id,
      died,
      kills: player.kills,
      score: Math.round(player.points),
      damage: Math.round(stats.damage),
      healing: Math.round(stats.healing),
      wood: Math.round(stats.wood),
      food: Math.round(stats.food),
      stone: Math.round(stats.stone),
      gold: Math.round(stats.gold),
      animalDamage: Math.round(stats.animalDamage),
      animalKills,
      playtime: Date.now() - start,
      owned: this.ownedThisLife(player),
      look: {
        hat: player.skinIndex,
        acc: player.tailIndex,
        weapon: player.weaponIndex,
        variant: config.fetchVariant(player).id,
        color: player.skinColor,
      },
    });
  }

  private ownedThisLife(player: Player): LifeReport["owned"] {
    const weapons: Record<number, number> = {};
    for (const id of player.weapons) {
      weapons[id] = config.fetchVariant({ weaponIndex: id, weaponXP: player.weaponXP, member: player.member }).id;
    }
    const ids = (owned: Record<number, number>) => Object.keys(owned).filter((id) => owned[Number(id)]).map(Number);
    return { hats: ids(player.skins), accs: ids(player.tails), weapons };
  }

  private join(client: SimClient, player: Player, raw: MsgPackValue): void {
    if (player.alive) return;

    const data = (raw ?? {}) as { name?: string; moofoll?: unknown; skin?: unknown; anon?: unknown };
    const account = this.sessions.get(player)?.account;

    let name = sanitize(String(data.name ?? "")).trim();
    if (account?.name) name = account.name;
    else if (isRude(name) || liveNameBlocked(name) || this.reservedNames.has(name.toLowerCase())) name = "unknown";
    if (account?.name && data.anon === 1) this.anonymous.add(player);
    else this.anonymous.delete(player);
    player.clan = account?.clan ?? null;

    this.spawnPlayer(player, name, Number(data.skin) || 0, !!data.moofoll);
    this.lifeStart.set(player, Date.now());
    this.sendJoinState(client, player);
  }

  public spawnPlayer(player: Player, name: string, skin: number, withResources = false): void {
    if (player.alive) return;

    player.setUserData({ name, skin });
    player.spawn(withResources);

    const spawn = this.objectManager.fetchSpawnObj(player.sid)
      ?? findSpawnPoint(this.objectManager, player.scale);
    player.x = spawn[0];
    player.y = spawn[1];

    player.skinIndex = 0;
    player.tailIndex = 0;
    player.skin = null;
    player.tail = null;
    player.iconIndex = 0;
  }

  private sendJoinState(client: SimClient, player: Player): void {
    client.send(ServerPacket.SetInitData, { teams: this.clans.snapshot() });
    client.send(ServerPacket.SetupGame, player.sid);
    client.send(ServerPacket.AddPlayer, player.getData() as unknown as MsgPackValue, 1);
    player.sentTo[player.id] = true;
    this.sendOwnState(client, player);
  }

  private sendOwnState(client: SimClient, player: Player): void {
    this.hooks.send(player.id, ServerPacket.UpdateItems, player.items, 0);
    this.hooks.send(player.id, ServerPacket.UpdateItems, player.weapons, 1);

    for (const key of RESOURCE_KEYS) {
      client.send(ServerPacket.UpdatePlayerValue, key, player[key], 1);
    }
    client.send(ServerPacket.UpdatePlayerValue, "kills", player.kills, 1);

    client.send(ServerPacket.UpdateAge, player.XP, fixTo(player.maxXP, 1), player.age);
    this.hooks.send(player.id, ServerPacket.UpdateUpgrades, player.upgradePoints, player.upgrAge);
    for (const group of itemData.groups) {
      client.send(ServerPacket.UpdateItemCounts, group.id, player.itemCounts[group.id] ?? 0);
    }

    for (const key of Object.keys(player.skins)) {
      const hat = findHat(Number(key));
      if (hat && (hat.price > 0 || hat.dontSell)) this.hooks.send(player.id, ServerPacket.UpdateStoreItems, 0, hat.id, 0);
    }
    for (const key of Object.keys(player.tails)) {
      const accessory = findAccessory(Number(key));
      if (accessory && (accessory.price > 0 || accessory.dontSell)) {
        this.hooks.send(player.id, ServerPacket.UpdateStoreItems, 0, accessory.id, 1);
      }
    }
  }

  private handlePacket(client: SimClient, player: Player, type: string, args: MsgPackValue[]): void {
    switch (type) {
      case ClientPacket.PingSocket:
        client.send(ServerPacket.PingSocketResponse);
        return;

      case ClientPacket.JoinGame:
        this.join(client, player, args[0]);
        return;

      case ClientPacket.CreateClan:
        if (player.alive) this.clans.create(player, args[0]);
        return;

      case ClientPacket.LeaveClan:
        if (player.alive) this.clans.leave(player);
        return;

      case ClientPacket.JoinClan:
        if (player.alive) this.clans.requestJoin(player, args[0]);
        return;

      case ClientPacket.JoinRequest:
        if (player.alive) this.clans.answerRequest(player, args[0], args[1]);
        return;

      case ClientPacket.KickFromClan:
        if (player.alive) this.clans.kick(player, args[0]);
        return;

      case ClientPacket.RequestPlayerStats: {
        const target = this.players.find((other) => other.sid === Number(args[0]));
        if (!target) return;
        this.statsTargets.set(player, target.sid);
        this.sendStats(player, target);
        void this.sendProfile(player, target);
        return;
      }

      case ClientPacket.SetAnonymous:
        this.setAnonymous(player, args[0] === 1);
        return;

      case ClientPacket.ReportPlayer: {
        const target = this.findPlayer(Number(args[0]));
        if (target && target !== player && this.clientsByPlayer.has(target)) {
          void this.report(player, target, Number(args[1]) || 0, Number(args[2]) || 0);
        }
        return;
      }

      case ClientPacket.AdminCommand:
        if (player.alive && (serverConfig.localAdmin || canRunAdminCommand(this.sessions.get(player)?.account?.role, args[0]))) {
          runAdminCommand(this, player, args);
        }
        return;
    }

    if (!player.alive) return;

    switch (type) {
      case ClientPacket.Move: {
        const angle = args[0];
        player.moveDir = typeof angle === "number" && Number.isFinite(angle) ? angle : undefined;
        return;
      }

      case ClientPacket.ResetMovementDir:
        player.resetMoveDir();
        return;

      case ClientPacket.SendAim: {
        const angle = args[0];
        if (typeof angle === "number" && Number.isFinite(angle)) player.dir = angle;
        return;
      }

      case ClientPacket.SendHit: {
        const state = Number(args[0]) || 0;
        const angle = args[1];
        if (typeof angle === "number" && Number.isFinite(angle)) player.dir = angle;

        if (player.buildIndex >= 0) {
          if (state) player.buildItem(itemData.list[player.buildIndex]);
          return;
        }
        player.mouseState = state;
        if (state) player.gathering = 1;
        return;
      }

      case ClientPacket.AutoGather:
        if (args[0]) player.autoGather = player.autoGather ? 0 : 1;
        else player.lockDir = !player.lockDir;
        return;

      case ClientPacket.SelectToBuild:
        this.selectItem(player, Number(args[0]), !!args[1]);
        return;

      case ClientPacket.SendUpgrade:
        this.applyUpgrade(player, Number(args[0]));
        return;

      case ClientPacket.Store:
        this.handleStore(player, Number(args[0]), Number(args[1]), !!args[2]);
        return;

      case ClientPacket.SendChat:
        this.handleChat(player, args[0]);
        return;

      case ClientPacket.PingMap:
        this.handleMapPing(player);
        return;
    }
  }

  private selectItem(player: Player, index: number, isWeapon: boolean): void {
    if (!Number.isInteger(index)) return;

    if (isWeapon) {
      if (!player.weapons.includes(index)) return;
      player.buildIndex = -1;
      player.weaponIndex = index;
      player.weaponVariant = config.fetchVariant(player).id;
      return;
    }

    if (!player.items.includes(index)) return;
    player.buildIndex = player.buildIndex === index ? -1 : index;
  }

  public applyUpgrade(player: Player, index: number): void {
    if (player.upgradePoints <= 0 || !Number.isInteger(index) || index < 0) return;

    if (index < itemData.weapons.length) {
      const weapon = itemData.weapons[index];
      if (weapon.age !== player.upgrAge) return;
      if (!config.allowAllUpgrades && weapon.pre != null && !player.weapons.includes(weapon.pre)) return;

      player.weapons[weapon.type] = weapon.id;
      if (weapon.type === 0) player.weaponIndex = weapon.id;
      player.weaponVariant = config.fetchVariant(player).id;
      this.hooks.send(player.id, ServerPacket.UpdateItems, player.weapons, 1);
    } else {
      const item = itemData.list[index - itemData.weapons.length];
      if (!item || item.age !== player.upgrAge) return;
      if (!config.allowAllUpgrades && item.pre != null && !player.items.includes(item.pre)) return;

      player.addItem(item.id);
      this.hooks.send(player.id, ServerPacket.UpdateItems, player.items, 0);
    }

    player.upgradePoints--;
    player.upgrAge++;
    this.hooks.send(player.id, ServerPacket.UpdateUpgrades, player.upgradePoints, player.upgrAge);
  }

  public handleStore(
    player: Player, action: number, id: number, isAccessory: boolean,
  ): boolean {
    const cosmetic: Cosmetic | undefined = isAccessory ? findAccessory(id) : findHat(id);
    const owned = isAccessory ? player.tails : player.skins;

    if (action === 0) {
      if (id !== 0) {
        if (!cosmetic || !owned[id]) return false;
        if (isAccessory) {
          player.tailIndex = id;
          player.tail = cosmetic;
        } else {
          player.skinIndex = id;
          player.skin = cosmetic;
        }
      } else if (isAccessory) {
        player.tailIndex = 0;
        player.tail = null;
      } else {
        player.skinIndex = 0;
        player.skin = null;
      }

      this.hooks.send(player.id, ServerPacket.UpdateStoreItems, 1, id, isAccessory ? 1 : 0);
      return true;
    }

    if (!cosmetic || cosmetic.dontSell || owned[id]) return false;
    if (player.points < cosmetic.price) return false;

    this.awardScore(player, -cosmetic.price, true);
    owned[id] = 1;
    this.hooks.send(player.id, ServerPacket.UpdateStoreItems, 0, id, isAccessory ? 1 : 0);
    return true;
  }

  private handleChat(player: Player, raw: MsgPackValue): void {
    if (typeof raw !== "string") return;

    const message = capChatLength(censor(sanitize(raw).replace(/\s+/g, " ").trim()));
    if (!message) return;

    const reply = this.plugin.onCommand(message);
    if (reply !== null) {
      this.hooks.send(player.id, ServerPacket.ReceiveChat, -1, reply);
      return;
    }

    this.deliverChat(player, message);
  }

  public deliverChat(player: Player, message: string): void {
    if (this.sessions.get(player)?.shadow) {
      this.hooks.send(player.id, ServerPacket.ReceiveChat, player.sid, message);
      return;
    }
    for (const other of this.players) {
      if (other.alive && other.canSee(player)) {
        this.hooks.send(other.id, ServerPacket.ReceiveChat, player.sid, message);
      }
    }
    this.plugin.onChat(player, message);
  }

  private handleMapPing(player: Player): void {
    const x = Math.round(player.x);
    const y = Math.round(player.y);

    const audience = player.team ? this.clans.members(player.team) : [player];
    for (const other of audience) {
      this.hooks.send(other.id, ServerPacket.PingMap, x, y);
    }
  }

  private reportTarget(player: Player): ReportTarget {
    const session = this.sessions.get(player);
    return { account: session?.account?.id ?? null, did: session?.did ?? null, name: player.name };
  }

  private async report(reporter: Player, target: Player, action: number, reason: number): Promise<void> {
    const staffAction = this.isStaff(this.sessions.get(reporter)) ? action : 0;
    const verdict = await reportPlayer(this.reportTarget(reporter), this.reportTarget(target), staffAction, reason);
    if (!verdict) return;

    const session = this.sessions.get(target);
    if (session) this.moderate({ id: session.account?.id, did: session.did ?? undefined }, verdict);
  }

  public moderate(target: { id?: string; did?: string }, action: ModerationAction): number {
    let matched = 0;
    for (const [player, session] of this.sessions) {
      const byAccount = target.id !== undefined && session.account?.id === target.id;
      const byDevice = target.did !== undefined && session.did === target.did;
      if (!byAccount && !byDevice) continue;

      matched++;
      if (action === "kick" || action === "ban") {
        this.kick(player, action === "ban" ? "You have been banned" : "You were kicked");
      } else {
        session.shadow = action === "shadow";
      }
    }
    return matched;
  }

  public kick(player: Player, reason: string): void {
    const client = this.clientsByPlayer.get(player);
    if (!client) return;
    client.send(ServerPacket.Disconnect, reason);
    client.close(4003, reason);
  }

  public setReserved(names: string[], clans: string[]): void {
    this.reservedNames = new Set(names);
    this.clans.reservedClans = new Set(clans);
  }

  public shutdownNotice(seconds: number): void {
    this.hooks.broadcast(ServerPacket.ServerShutdownNotice, Math.max(0, Math.round(seconds)));
  }

  public kickAll(reason: string): void {
    for (const player of [...this.clientsByPlayer.keys()]) this.kick(player, reason);
  }

  public simStats(): Record<string, unknown> {
    return {
      humans: this.humanCount(),
      capacity: this.capacity(),
      clans: this.clans.clans.map((clan) => clan.sid),
      ...this.plugin.stats(),
    };
  }

  public structureCounts(): Map<number, number> {
    const counts = new Map<number, number>();
    for (const obj of this.gameObjects) {
      if (!obj.active || !obj.owner || !obj.isItem) continue;
      counts.set(obj.owner.sid, (counts.get(obj.owner.sid) ?? 0) + 1);
    }
    return counts;
  }

  public objectsNear(x: number, y: number, radius: number): GameObject[][] {
    return this.objectManager.getGridArrays(x, y, radius);
  }

  public takenNames(): Set<string> {
    return new Set(this.players.map((player) => player.name.toLowerCase()));
  }

  public addHeadlessPlayer(name: string): Player | null {
    if (this.players.length >= config.maxPlayersHard) return null;

    const id = `h${this.nextHeadlessId++}`;
    const sid = this.nextSid++;

    const player: Player = new Player(
      id, sid, config, this.projectileManager, this.objectManager,
      this.players, this.animals as unknown as Damageable[], itemData, hats, accessories,
      this.awardScore, this.hooks, () => this.handleDeath(player),
    );
    player.setUserData({ name, skin: 0 });

    this.players.push(player);
    this.playersById.set(id, player);
    return player;
  }

  public removeHeadlessPlayer(player: Player): void {
    this.clans.remove(player);
    this.objectManager.removeAllItems(player.sid, this.hooks);

    player.alive = false;
    player.active = false;

    this.playersById.delete(player.id);

    const index = this.players.indexOf(player);
    if (index >= 0) this.players.splice(index, 1);

    this.hooks.broadcast(ServerPacket.RemovePlayer, player.id);
  }

  public refreshPlayer(player: Player): void {
    player.sentTo = {};
    const client = this.clientsByPlayer.get(player);
    if (!client) return;
    client.send(ServerPacket.AddPlayer, player.getData() as unknown as MsgPackValue, 1);
    player.sentTo[player.id] = true;
    this.sendOwnState(client, player);
  }

  public findPlayer(sid: number): Player | undefined {
    return this.players.find((player) => player.sid === sid);
  }

  public sendTo(player: Player, packet: string, ...args: MsgPackValue[]): void {
    this.clientsByPlayer.get(player)?.send(packet, ...args);
  }

  public spawn(player: Player, name: string, skin: number): void {
    this.spawnPlayer(player, name, skin);
  }

  public move(player: Player, angle: number | null): void {
    player.moveDir = angle !== null && Number.isFinite(angle) ? angle : undefined;
  }

  public aim(player: Player, angle: number): void {
    if (Number.isFinite(angle)) player.dir = angle;
  }

  public attack(player: Player, held: boolean): void {
    player.mouseState = held ? 1 : 0;
    if (held) player.gathering = 1;
  }

  public selectWeapon(player: Player, weaponId: number): boolean {
    if (!player.weapons.includes(weaponId)) return false;
    player.buildIndex = -1;
    player.weaponIndex = weaponId;
    player.weaponVariant = config.fetchVariant(player).id;
    return true;
  }

  public place(player: Player, itemId: number, angle: number): boolean {
    if (!player.items.includes(itemId)) return false;
    const item = itemData.list[itemId];
    if (!item) return false;

    player.buildIndex = itemId;
    if (Number.isFinite(angle)) player.dir = angle;
    player.buildItem(item);

    const done = player.buildIndex !== itemId;
    player.buildIndex = -1;
    return done;
  }

  public upgrade(player: Player, actionBarIndex: number): void {
    this.applyUpgrade(player, actionBarIndex);
  }

  public buy(player: Player, id: number, isAccessory: boolean): boolean {
    return this.handleStore(player, 1, id, isAccessory);
  }

  public equip(player: Player, id: number, isAccessory: boolean): boolean {
    return this.handleStore(player, 0, id, isAccessory);
  }

  public say(player: Player, text: string): void {
    this.handleChat(player, text);
  }

  public createClan(player: Player, name: string): void {
    this.clans.create(player, name);
  }

  public joinClan(player: Player, clanSid: string): void {
    this.clans.requestJoin(player, clanSid);
  }

  public leaveClan(player: Player): void {
    this.clans.leave(player);
  }

  public acceptClanRequest(owner: Player, applicantSid: number): void {
    this.clans.answerRequest(owner, applicantSid, 1);
  }


  private tick(): void {
    const now = Date.now();
    const delta = Math.min(now - this.lastTick, 200);
    this.lastTick = now;

    for (const player of this.players) {
      if (player.alive) player.update(delta);
    }
    for (const animal of this.animals) {
      if (animal.active) animal.update(delta);
    }
    for (const projectile of this.projectiles) {
      if (projectile.active) projectile.update(delta);
    }
    for (const obj of [...this.objectManager.updateObjects]) {
      this.updateStructure(obj, delta);
    }

    this.plugin.tick(delta);
    this.tickGold(delta);
    this.tickTurretGear(delta);
    this.sendWorld();
    this.tickLeaderboard(delta);
    this.tickMinimap(delta);
    this.tickStats(delta);
  }

  private tickStats(delta: number): void {
    this.statsTimer += delta;
    if (this.statsTimer < serverConfig.statsInterval) return;
    this.statsTimer -= serverConfig.statsInterval;

    for (const [viewer, sid] of this.statsTargets) {
      const target = this.findPlayer(sid);
      if (!target) {
        this.statsTargets.delete(viewer);
        continue;
      }
      this.sendStats(viewer, target);
    }
  }

  private sendStats(viewer: Player, target: Player): void {
    const stats = target.stats;
    const session = this.sessions.get(target);
    const accountId = session?.account?.id ?? (session?.did ? `g:${session.did}` : 0);
    this.sendTo(
      viewer, ServerPacket.PlayerStats,
      target.sid, target.kills,
      Math.round(stats.wood), Math.round(stats.food), Math.round(stats.stone), Math.round(stats.gold),
      Math.round(stats.damage), Math.round(stats.animalDamage), Math.round(stats.healing),
      stats.animals, stats.bosses, accountId, Math.round(target.points),
    );
  }

  private tickGold(delta: number): void {
    this.goldTimer += delta;
    if (this.goldTimer < GOLD_INTERVAL) return;
    this.goldTimer -= GOLD_INTERVAL;

    for (const player of this.players) {
      if (!player.alive) continue;
      const fromMills = player.pps;
      const earned = fromMills + (player.skin?.pps ?? 0) + (player.tail?.pps ?? 0);

      if (earned) this.awardScore(player, earned, true);
      if (fromMills > 0) player.earnXP(fromMills);
    }
  }

  private updateStructure(obj: GameObject, delta: number): void {
    if (!obj.active || !obj.shootRate || obj.projectile == null) return;

    obj.shootCount -= delta;
    if (obj.shootCount > 0) return;
    obj.shootCount = obj.shootRate;

    const target = this.nearestEnemy(obj.x, obj.y, obj.shootRange ?? 0, obj.owner?.sid, obj.owner?.team);
    if (!target) return;

    obj.dir = getDirection(target.x, target.y, obj.x, obj.y);

    this.projectileManager.addProjectile(
      obj.x, obj.y, obj.dir, obj.shootRange ?? 0, serverConfig.turretProjectileSpeed,
      obj.projectile, obj.owner as unknown as Damageable, obj.sid, obj.layer,
    );

    for (const player of this.players) {
      if (obj.sentTo[player.sid]) {
        this.hooks.send(player.sid, ServerPacket.ShootTurret, obj.sid, fixTo(obj.dir, 2));
      }
    }
  }

  private tickTurretGear(delta: number): void {
    for (const player of this.players) {
      const turret = player.skin?.turret;
      if (!player.alive || !turret) continue;

      const state = player as unknown as { turretReload?: number };
      state.turretReload = (state.turretReload ?? 0) - delta;
      if (state.turretReload > 0) continue;
      state.turretReload = turret.rate;

      const target = this.nearestEnemy(player.x, player.y, turret.range, player.sid, player.team);
      if (!target) continue;

      const dir = getDirection(target.x, target.y, player.x, player.y);
      this.projectileManager.addProjectile(
        player.x, player.y, dir, turret.range, serverConfig.turretProjectileSpeed,
        turret.proj, player as unknown as Damageable, null, player.zIndex,
      );
    }
  }

  private nearestEnemy(
    x: number, y: number, range: number, ownerSid?: number, team?: string | null,
  ): Damageable | null {
    if (range <= 0) return null;

    let best: Damageable | null = null;
    let bestDistance = Infinity;

    for (const entity of [...this.players, ...this.animals] as unknown as Damageable[]) {
      if (!entity.alive || entity.sid === ownerSid) continue;
      if (team && entity.team === team) continue;
      if (entity.skin?.antiTurret || entity.tail?.antiTurret) continue;

      const distance = getDistance(x, y, entity.x, entity.y);
      if (distance > range || distance >= bestDistance) continue;

      bestDistance = distance;
      best = entity;
    }
    return best;
  }


  private sendWorld(): void {
    for (const [player, client] of this.clientsByPlayer) {
      if (!player.active) continue;

      this.sendObjects(player, client);
      this.sendPlayers(player, client);
      this.sendAnimals(player, client);
    }
  }

  private sendObjects(player: Player, client: SimClient): void {
    const payload: MsgPackValue[] = [];

    for (const obj of this.gameObjects) {
      if (!obj.active || obj.sentTo[player.sid]) continue;
      if (!player.canSee(obj)) continue;
      if (!obj.visibleToPlayer(player)) continue;

      obj.sentTo[player.sid] = true;
      payload.push(
        obj.sid, fixTo(obj.x, 1), fixTo(obj.y, 1), fixTo(obj.dir, 2),
        obj.scale, obj.type ?? -1, obj.id ?? -1, obj.owner ? obj.owner.sid : -1,
      );
    }

    if (payload.length) client.send(ServerPacket.LoadGameObject, payload);
  }

  private sendPlayers(player: Player, client: SimClient): void {
    const positions: MsgPackValue[] = [];
    const attributes: MsgPackValue[] = [];
    const view = this.views.get(player);
    const seen = new Set<number>();

    for (const other of this.players) {
      if (!other.alive) continue;
      if (other !== player && !player.canSee(other)) continue;

      if (!other.sentTo[player.id]) {
        other.sentTo[player.id] = true;
        client.send(
          ServerPacket.AddPlayer,
          this.playerDataFor(other, player),
          other === player ? 1 : 0,
        );
      }

      seen.add(other.sid);
      positions.push(other.sid, fixTo(other.x, 1), fixTo(other.y, 1), Math.round(other.dir * 100));
      attributes.push(
        other.sid, other.buildIndex, other.weaponIndex, other.weaponVariant,
        other.team, other.isLeader ? 1 : 0,
        other.skinIndex, other.tailIndex, other.iconIndex, other.zIndex,
      );
    }

    client.send(ServerPacket.UpdatePlayers, positions, attributes, this.hiddenSince(view?.players, seen));
    if (view) view.players = seen;
  }

  private sendAnimals(player: Player, client: SimClient): void {
    const payload: MsgPackValue[] = [];
    const view = this.views.get(player);
    const seen = new Set<number>();

    for (const animal of this.animals) {
      if (!animal.active || !player.canSee(animal)) continue;

      seen.add(animal.sid);
      payload.push(
        animal.sid, animal.index, fixTo(animal.x, 1), fixTo(animal.y, 1),
        Math.round(animal.dir * 100), Math.round(animal.health), animal.nameIndex, animal.state,
      );
    }

    client.send(ServerPacket.LoadAI, payload, this.hiddenSince(view?.animals, seen));
    if (view) view.animals = seen;
  }

  private hiddenSince(before: Set<number> | undefined, now: Set<number>): number[] {
    const hidden: number[] = [];
    if (before) for (const sid of before) if (!now.has(sid)) hidden.push(sid);
    return hidden;
  }

  private isAnonymousTo(player: Player, viewer: Player): boolean {
    return player !== viewer && this.anonymous.has(player);
  }

  private playerDataFor(player: Player, viewer: Player): MsgPackValue {
    const data = player.getData() as unknown as MsgPackValue[];
    if (this.isAnonymousTo(player, viewer)) {
      data[2] = `Anon#${player.sid}`;
      data[12] = null;
    }
    return data;
  }

  private setAnonymous(player: Player, on: boolean): void {
    if (!this.sessions.get(player)?.account?.name || this.anonymous.has(player) === on) return;
    const now = Date.now();
    if (now - (this.anonChangedAt.get(player) ?? 0) < ANON_COOLDOWN) return;
    this.anonChangedAt.set(player, now);

    if (on) this.anonymous.add(player);
    else this.anonymous.delete(player);
    for (const id of Object.keys(player.sentTo)) if (id !== player.id) delete player.sentTo[id];
  }

  private async sendProfile(viewer: Player, target: Player): Promise<void> {
    const client = this.clientsByPlayer.get(viewer);
    const account = this.sessions.get(target)?.account;
    if (!client || !account?.name) return;

    if (this.isAnonymousTo(target, viewer)) {
      client.send(ServerPacket.PlayerProfile, target.sid, JSON.stringify({ name: `Anon#${target.sid}`, anon: true, guest: false }));
      return;
    }
    const profile = await fetchProfile(account.name);
    if (profile && this.statsTargets.get(viewer) === target.sid) {
      client.send(ServerPacket.PlayerProfile, target.sid, JSON.stringify(profile));
    }
  }

  private tickLeaderboard(delta: number): void {
    this.leaderboardTimer += delta;
    if (this.leaderboardTimer < LEADERBOARD_INTERVAL) return;
    this.leaderboardTimer -= LEADERBOARD_INTERVAL;

    this.updateKillLeader();

    const ranked = this.players
      .filter((player) => player.alive || (this.clientsByPlayer.has(player) && player.points > 0))
      .sort((a, b) => b.points - a.points)
      .slice(0, LEADERBOARD_SIZE);

    const rows: MsgPackValue[] = [];
    const roles: MsgPackValue[] = [];
    const dead: MsgPackValue[] = [];
    const clanTags: MsgPackValue[] = [];
    const tribeTags: MsgPackValue[] = [];

    for (const player of ranked) {
      const anonymous = this.anonymous.has(player);
      rows.push(player.sid, anonymous ? `Anon#${player.sid}` : player.name, Math.round(player.points));
      if (!player.alive) dead.push(player.sid);

      const account = this.sessions.get(player)?.account;
      if (account) roles.push(player.sid, account.role ? ROLE_BADGES[account.role] : 0);
      if (player.clan && !anonymous) clanTags.push(player.sid, player.clan);
      if (player.team) tribeTags.push(player.sid, player.team);
    }
    const crabKillers = ranked.filter((player) => this.falls.crabKillers.has(player.sid)).map((player) => player.sid);

    this.hooks.broadcast(ServerPacket.UpdateLeaderboard, rows, roles, dead, crabKillers, clanTags, tribeTags);
  }

  private updateKillLeader(): void {
    let leader: Player | null = null;
    for (const player of this.players) {
      if (player.alive && player.kills > 0 && (!leader || player.kills > leader.kills)) leader = player;
    }
    for (const player of this.players) player.iconIndex = player === leader ? 1 : 0;
  }

  private tickMinimap(delta: number): void {
    this.minimapTimer += delta;
    if (this.minimapTimer < config.minimapRate) return;
    this.minimapTimer -= config.minimapRate;

    for (const player of this.players) {
      if (!player.alive) continue;
      const staff = this.isStaff(this.sessions.get(player));
      if (!player.team && !staff) continue;

      const payload: MsgPackValue[] = [];
      const shown = staff ? this.players.filter((other) => other.alive) : this.clans.members(player.team!);
      for (const mate of shown) {
        if (mate === player || mate.x < 0) continue;
        payload.push(Math.round(mate.x), Math.round(mate.y));
      }
      this.hooks.send(player.id, ServerPacket.UpdateMinimap, payload);
    }
  }
}
