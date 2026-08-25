import { setNativeResolution } from "../../render/canvas";
import { loadBool, loadSetting, saveBool, saveSetting } from "../../utils/storage";
import { ui } from "../elements";

export let showPing = false;

export function loadSettings(): void {
  const native = loadBool("native_resolution", false);
  setNativeResolution(native);
  ui.nativeResolutionToggle.checked = native;

  showPing = loadBool("show_ping", false);
  ui.showPingToggle.checked = showPing;
  ui.pingDisplay.hidden = !showPing;

  ui.nameInput.value = loadSetting("moo_name") ?? "";
}

export function bindSettingToggles(): void {
  ui.nativeResolutionToggle.onchange = () => {
    const enabled = ui.nativeResolutionToggle.checked;
    setNativeResolution(enabled);
    saveBool("native_resolution", enabled);
  };

  ui.showPingToggle.onchange = () => {
    showPing = ui.showPingToggle.checked;
    ui.pingDisplay.hidden = !showPing;
    saveBool("show_ping", showPing);
  };
}

export function saveName(): void {
  saveSetting("moo_name", ui.nameInput.value);
}

export function getPlayerName(): string {
  return ui.nameInput.value;
}

export function toggleSettings(): void {
  const label = ui.settingsButton.getElementsByTagName("span")[0];
  const showing = ui.guideCard.classList.toggle("showing");
  if (label) label.innerText = showing ? "Close" : "Settings";
}
