import { camera } from "../../render/camera";
import { isSandbox } from "../../environment";
import { account, onAccountChange, savePref, type AccountPrefs } from "../../net/api/account";
import { setNativeResolution } from "../../render/canvas";
import { byId } from "../../utils/dom";
import { grid } from "../../render/layers/ground";
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

  grid.visible = loadBool("show_grid", true);
  ui.showGridToggle.checked = grid.visible;
  camera.locked = loadBool("camera_lock", false);
  ui.cameraLockToggle.checked = camera.locked;
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

  ui.showGridToggle.onchange = () => {
    grid.visible = ui.showGridToggle.checked;
    saveBool("show_grid", grid.visible);
  };

  ui.cameraLockToggle.onchange = () => {
    camera.locked = ui.cameraLockToggle.checked;
    saveBool("camera_lock", camera.locked);
  };
}

const PREF_TOGGLES: Record<keyof AccountPrefs, string> = {
  friendNotifs: "prefFriendNotifs",
  friendRequests: "prefFriendRequests",
  clanInvites: "prefClanInvites",
};

function showAccountPrefs(): void {
  byId("accountPrefs").style.display = !isSandbox() && account.name ? "" : "none";
  for (const [key, id] of Object.entries(PREF_TOGGLES)) {
    byId<HTMLInputElement>(id, "input").checked = account.prefs[key as keyof AccountPrefs];
  }
}

export function bindAccountPrefs(): void {
  onAccountChange(showAccountPrefs);
  showAccountPrefs();

  for (const [key, id] of Object.entries(PREF_TOGGLES) as [keyof AccountPrefs, string][]) {
    const toggle = byId<HTMLInputElement>(id, "input");
    toggle.onchange = () => {
      const { prefs } = account;
      prefs[key] = toggle.checked;
      if (!prefs.friendNotifs || !prefs.friendRequests) byId("friendToast").style.display = "none";
      if (!prefs.friendNotifs) byId("inviteBanner").style.display = "none";
      savePref(key, toggle.checked).catch(() => {});
    };
  }
}

export function saveName(): void {
  saveSetting("moo_name", ui.nameInput.value);
}

export function getPlayerName(): string {
  return ui.nameInput.value;
}
