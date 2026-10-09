export const ClientPacket = {
  JoinGame: "M",
  SendAim: "D",
  Move: "9",
  SendHit: "F",
  AutoGather: "K",
  SelectToBuild: "z",
  SendUpgrade: "H",
  Store: "c",
  SendChat: "6",
  PingMap: "S",
  ResetMovementDir: "e",
  JoinRequest: "P",
  KickFromClan: "Q",
  CreateClan: "L",
  LeaveClan: "N",
  JoinClan: "b",
  PingSocket: "0",
  ReportPlayer: "R",
  AdminCommand: "A",
  RequestPlayerStats: "V",
  Telemetry: "T",
} as const;

export type ClientPacketType = (typeof ClientPacket)[keyof typeof ClientPacket];

// dont change this order, this is the specific order that the cipher table is built with, if you change it then the cipher used will not match what the game expects
// 1.9 appended T, R, A, V
export const CLIENT_CODES = [
  "M", "D", "9", "e", "F", "z", "H", "K", "L", "N", "b", "P", "Q", "c", "6", "S", "0",
  "T", "R", "A", "V",
];
