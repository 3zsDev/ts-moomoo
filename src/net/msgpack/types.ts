export type MsgPackValue =
  | null
  | undefined
  | boolean
  | number
  | string
  | Uint8Array
  | MsgPackValue[]
  | { [key: string]: MsgPackValue };
