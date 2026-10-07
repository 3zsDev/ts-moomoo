import { isRude, sanitize } from "../../../../api/lib/filter.mjs";
import { ServerPacket, type MsgPackValue, type Player, type ServerHooks } from "../../shared";

export interface Clan {
  sid: string;
  owner: number;
  clan?: string;
}

const MAX_NAME_LENGTH = 7;
const SOLO = "solo";

export class ClanManager {
  public readonly clans: Clan[] = [];
  public onJoinRequest: ((owner: Player, applicant: Player) => void) | null = null;
  public reservedClans = new Set<string>();

  public constructor(
    private readonly players: Player[],
    private readonly hooks: ServerHooks,
  ) {}

  public find(sid: string): Clan | undefined {
    return this.clans.find((clan) => clan.sid === sid);
  }

  public members(sid: string): Player[] {
    return this.players.filter((player) => player.team === sid && player.alive);
  }

  private ownerOf(clan: Clan): Player | undefined {
    return this.players.find((player) => player.sid === clan.owner);
  }

  public create(player: Player, rawName: MsgPackValue): void {
    if (player.team || typeof rawName !== "string") return;

    const name = sanitize(rawName)
      .slice(0, MAX_NAME_LENGTH)
      .replace(/[^\w:()/? -]+/gim, " ")
      .trim();

    if (!name || this.find(name) || isRude(name)) return;

    const key = name.toLowerCase();
    if (key === SOLO) return;
    const ownClan = player.clan?.toLowerCase() === key;
    if (this.reservedClans.has(key) && !ownClan) return;

    const clan: Clan = { sid: name, owner: player.sid };
    if (ownClan) clan.clan = player.clan!;
    this.clans.push(clan);

    player.team = name;
    player.isOwner = true;
    player.isLeader = true;

    this.hooks.broadcast(ServerPacket.AddAlliance, clan as unknown as MsgPackValue);
    this.hooks.send(player.id, ServerPacket.SetPlayerTeam, name, 1);
    this.sendMembers(name);
  }

  public leave(player: Player): void {
    const team = player.team;
    if (!team) return;

    const clan = this.find(team);
    if (clan && clan.owner === player.sid) {
      this.disband(clan);
      return;
    }

    player.team = null;
    player.isOwner = false;
    player.isLeader = false;
    this.hooks.send(player.id, ServerPacket.SetPlayerTeam, null, 0);
    this.sendMembers(team);
  }

  public deleteClan(sid: string): boolean {
    const clan = this.find(sid);
    if (!clan) return false;
    this.disband(clan);
    return true;
  }

  private disband(clan: Clan): void {
    for (const member of this.players) {
      if (member.team !== clan.sid) continue;
      member.team = null;
      member.isOwner = false;
      member.isLeader = false;
      this.hooks.send(member.id, ServerPacket.SetPlayerTeam, null, 0);
    }

    const index = this.clans.indexOf(clan);
    if (index >= 0) this.clans.splice(index, 1);
    this.hooks.broadcast(ServerPacket.DeleteAlliance, clan.sid);
  }

  public requestJoin(player: Player, clanSid: MsgPackValue): void {
    if (player.team || typeof clanSid !== "string") return;

    const clan = this.find(clanSid);
    if (!clan) return;
    if (clan.clan && player.clan !== clan.clan) return;

    const owner = this.ownerOf(clan);
    if (!owner) return;

    this.hooks.send(owner.id, ServerPacket.AllianceNotification, player.sid, player.name);
    this.onJoinRequest?.(owner, player);
  }

  public answerRequest(owner: Player, sid: MsgPackValue, accepted: MsgPackValue): void {
    if (!owner.team || !owner.isOwner || !accepted) return;

    const target = this.players.find((player) => player.sid === sid);
    if (!target || target.team) return;
    const clan = this.find(owner.team);
    if (clan?.clan && target.clan !== clan.clan) return;

    target.team = owner.team;
    target.isOwner = false;
    target.isLeader = false;

    this.hooks.send(target.id, ServerPacket.SetPlayerTeam, owner.team, 0);
    this.sendMembers(owner.team);
  }

  public kick(owner: Player, sid: MsgPackValue): void {
    if (!owner.team || !owner.isOwner) return;

    const target = this.players.find((player) => player.sid === sid);
    if (!target || target.team !== owner.team || target === owner) return;

    target.team = null;
    target.isOwner = false;
    target.isLeader = false;

    this.hooks.send(target.id, ServerPacket.SetPlayerTeam, null, 0);
    this.sendMembers(owner.team);
  }

  public remove(player: Player): void {
    if (!player.team) return;

    const clan = this.find(player.team);
    if (clan && clan.owner === player.sid) {
      this.disband(clan);
      return;
    }

    const team = player.team;
    player.team = null;
    player.isOwner = false;
    player.isLeader = false;
    this.sendMembers(team);
  }

  public sendMembers(sid: string): void {
    const flat: MsgPackValue[] = [];
    const members = this.members(sid);
    for (const member of members) flat.push(member.sid, member.name);

    for (const member of members) {
      this.hooks.send(member.id, ServerPacket.SetAlliancePlayers, flat);
    }
  }

  public snapshot(): MsgPackValue {
    return this.clans.map((clan) => ({ ...clan })) as unknown as MsgPackValue;
  }
}
