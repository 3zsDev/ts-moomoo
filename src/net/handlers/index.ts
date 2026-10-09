import { addTelegraph } from "../../render/layers/telegraphs";
import { refreshLeaderboard } from "../../ui/hud/leaderboard";
import { serverShutdownNotice } from "../../ui/hud/ping";
import { applyStoreUpdate } from "../../ui/store";
import type { PacketHandlers } from "../Connection";
import { ServerPacket } from "../protocol";
import * as alliances from "./alliances";
import * as animals from "./animals";
import * as misc from "./misc";
import * as players from "./players";
import * as projectiles from "./projectiles";
import * as session from "./session";
import * as staff from "./staff";
import * as world from "./world";

export type { HandlerHooks } from "./session";
export { markPingSent } from "./misc";
export {
  onPlayerStats, reportPlayer, requestPlayerStats, sendAdminCommand,
  type PlayerStats, type ReportAction,
} from "./staff";

export function createHandlers(hooks: session.HandlerHooks): PacketHandlers {
  session.setHooks(hooks);

  return {
    [ServerPacket.SetInitData]: session.setInitData,
    [ServerPacket.Disconnect]: session.disconnect,
    [ServerPacket.SetupGame]: session.setupGame,
    [ServerPacket.KillPlayer]: session.killPlayer,

    [ServerPacket.AddPlayer]: players.addPlayer,
    [ServerPacket.RemovePlayer]: players.removePlayer,
    [ServerPacket.UpdatePlayers]: players.updatePlayers,
    [ServerPacket.UpdateHealth]: players.updateHealth,
    [ServerPacket.GatherAnimation]: players.gatherAnimation,
    [ServerPacket.UpdatePlayerValue]: players.updatePlayerValue,
    [ServerPacket.UpdateItemCounts]: players.updateItemCounts,
    [ServerPacket.UpdateItems]: players.updateItems,
    [ServerPacket.UpdateAge]: players.updateAge,
    [ServerPacket.UpdateUpgrades]: players.updateUpgrades,
    [ServerPacket.UpdateLeaderboard]: refreshLeaderboard,

    [ServerPacket.LoadGameObject]: world.loadGameObject,
    [ServerPacket.KillObject]: world.killObject,
    [ServerPacket.KillObjects]: world.killObjects,
    [ServerPacket.WiggleGameObject]: world.wiggleGameObject,
    [ServerPacket.ShootTurret]: world.shootTurret,

    [ServerPacket.LoadAI]: animals.loadAI,
    [ServerPacket.AnimateAI]: animals.animateAI,
    [ServerPacket.BossTelegraph]: addTelegraph,
    [ServerPacket.PlayerStats]: staff.playerStats,
    [ServerPacket.PlayerProfile]: staff.playerProfile,

    [ServerPacket.AddProjectile]: projectiles.addProjectile,
    [ServerPacket.RemoveProjectile]: projectiles.removeProjectile,

    [ServerPacket.AddAlliance]: alliances.addAlliance,
    [ServerPacket.DeleteAlliance]: alliances.deleteAlliance,
    [ServerPacket.AllianceNotification]: alliances.allianceNotification,
    [ServerPacket.SetPlayerTeam]: alliances.setPlayerTeam,
    [ServerPacket.SetAlliancePlayers]: alliances.setAlliancePlayers,

    [ServerPacket.UpdateStoreItems]: (isEquip: number, id: number, isAccessory: number) =>
      applyStoreUpdate(!!isEquip, id, !!isAccessory),

    [ServerPacket.ReceiveChat]: misc.receiveChat,
    [ServerPacket.UpdateMinimap]: misc.updateMinimap,
    [ServerPacket.ShowText]: misc.showText,
    [ServerPacket.PingMap]: misc.pingMap,
    [ServerPacket.PingSocketResponse]: misc.pingSocketResponse,
    [ServerPacket.ServerShutdownNotice]: serverShutdownNotice,
  };
}
