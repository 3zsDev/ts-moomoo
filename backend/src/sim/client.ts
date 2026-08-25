import type { MsgPackValue } from "../shared";

export interface SimClient {
  readonly socketId: number;
  readonly remoteAddress: string;
  readonly closed: boolean;

  send(type: string, ...args: MsgPackValue[]): void;
  close(code?: number, reason?: string): void;

  onPacket: ((type: string, args: MsgPackValue[]) => void) | null;
  onClose: (() => void) | null;
}
