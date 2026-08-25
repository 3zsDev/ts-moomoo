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
} as const;

export type ClientPacketType = (typeof ClientPacket)[keyof typeof ClientPacket];

export const CLIENT_CODES = [
  "M", "D", "9", "e", "F", "z", "H", "K", "L", "N", "b", "P", "Q", "c", "6", "S", "0",
];
