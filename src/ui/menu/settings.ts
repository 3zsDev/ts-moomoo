import { setNativeResolution } from "../../render/canvas";
import { loadBool, saveBool, saveSetting } from "../../utils/storage";
import { ui } from "../elements";
import { setNetStatsOptions } from "../hud/netStats";

export let showPing = false;
export let showFps = false;

function applyNativeResolution(enabled: boolean): void {
  setNativeResolution(enabled);
  ui.nativeResolutionToggle.checked = enabled;
  saveBool("native_resolution", enabled);
}

export function loadSettings(): void {
  applyNativeResolution(loadBool("native_resolution", true));

  showPing = loadBool("show_ping", false);
  ui.showPingToggle.checked = showPing;
  showFps = loadBool("show_fps", false);
  ui.showFpsToggle.checked = showFps;
  setNetStatsOptions(showPing, showFps);
}

export function bindSettingToggles(): void {
  ui.nativeResolutionToggle.onchange = () => applyNativeResolution(ui.nativeResolutionToggle.checked);

  ui.showPingToggle.onchange = () => {
    showPing = ui.showPingToggle.checked;
    saveBool("show_ping", showPing);
    setNetStatsOptions(showPing, showFps);
  };

  ui.showFpsToggle.onchange = () => {
    showFps = ui.showFpsToggle.checked;
    saveBool("show_fps", showFps);
    setNetStatsOptions(showPing, showFps);
  };
}

export function saveName(): void {
  saveSetting("moo_name", ui.nameInput.value);
}

export function getPlayerName(): string {
  return ui.nameInput.value;
}
