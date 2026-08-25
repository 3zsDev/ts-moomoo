export interface ProtectionOptions {
  lockWebSocket: boolean;
  bypassPatchedSend: boolean;
  blockDevToolsKeys: boolean;
  antiDebug: boolean;
  antiDebugInterval: number;
  detectUserscripts: boolean;
}
// off by default, use if you have a use for them
export const protection: ProtectionOptions = {
  lockWebSocket: false,
  bypassPatchedSend: false,
  blockDevToolsKeys: false,
  antiDebug: false,
  antiDebugInterval: 1000,
  detectUserscripts: false,
};
