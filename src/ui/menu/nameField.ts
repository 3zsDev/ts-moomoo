import { config } from "../../config";
import { account, auth, claimName, isNameReserved, onAccountChange } from "../../net/api";
import { loadSetting } from "../../utils/storage";
import { ui } from "../elements";

interface FrvrProfile {
  FRVR?: { profile?: { name(): string } };
}

export function refreshNameHint(error?: string): void {
  ui.nameInput.disabled = Boolean(account.name);
  if (account.name) ui.nameInput.value = account.name;

  ui.nameHint.className = error ? "error" : "";
  ui.nameHint.textContent = error || (!account.name && auth.isVerified() ? "Your name is permanent" : "");
}

export function checkName(): Promise<void> {
  if (!auth.isVerified()) {
    const name = ui.nameInput.value.trim();
    if (!name) return Promise.resolve();
    return isNameReserved(name).then((reserved) => {
      if (reserved) throw new Error("This name belongs to someone else");
      refreshNameHint();
    });
  }

  if (account.name) return Promise.resolve();
  return claimName(ui.nameInput.value).then(() => refreshNameHint());
}

export function bindNameField(onSubmit: () => void): void {
  let name = loadSetting("moo_name") || "";
  if (!name) {
    const profileName = (window as unknown as FrvrProfile).FRVR?.profile?.name();
    if (profileName) name = profileName + (Math.floor(Math.random() * 90) + 9);
  }
  ui.nameInput.value = name;

  ui.nameInput.onkeypress = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    onSubmit();
  };
  ui.nameInput.onchange = () => {
    ui.nameInput.value = (ui.nameInput.value || "").slice(0, config.maxNameLength);
  };

  onAccountChange(() => refreshNameHint());
  refreshNameHint();
}
