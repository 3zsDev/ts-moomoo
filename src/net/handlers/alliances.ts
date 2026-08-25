import { state, type Alliance } from "../../game/state";
import { addJoinRequest, isAllianceOpen, refreshAlliance } from "../../ui/alliance";

export function addAlliance(alliance: Alliance): void {
  state.alliances.push(alliance);
  if (isAllianceOpen()) refreshAlliance();
}

export function deleteAlliance(sid: string): void {
  state.alliances = state.alliances.filter((alliance) => alliance.sid !== sid);
  if (isAllianceOpen()) refreshAlliance();
}

export function allianceNotification(sid: number, name: string): void {
  addJoinRequest({ sid, name });
}

export function setPlayerTeam(team: string | null, isOwner: number): void {
  const me = state.me;
  if (!me) return;
  me.team = team;
  me.isOwner = !!isOwner;
  if (isAllianceOpen()) refreshAlliance();
}

export function setAlliancePlayers(members: (string | number)[]): void {
  state.allianceMembers = members;
  if (isAllianceOpen()) refreshAlliance();
}
