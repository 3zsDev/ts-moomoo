export class ExtData {
  public constructor(public readonly type: number, public readonly data: Uint8Array) {}
}

export type MsgPackValue =
  | null
  | undefined
  | boolean
  | number
  | string
  | Uint8Array
  | ArrayBufferView
  | Date
  | ExtData
  | MsgPackValue[]
  | { [key: string]: MsgPackValue };
