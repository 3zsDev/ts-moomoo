export type ProtocolSource = "live" | "bundled" | "builtin";
// this is for the checksum, a local one for testing is in moomooProtocol.ts but it gets regenerated so use live for actual servers
export const protocol = {
  protocolSource: "live" as ProtocolSource,
};
