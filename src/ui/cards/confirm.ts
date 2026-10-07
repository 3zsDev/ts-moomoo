import { byId } from "../../utils/dom";

const card = byId("confirmCard");
const text = byId("confirmText");
const yes = byId("confirmYes");
const no = byId("confirmNo");

let pending: (() => void) | null = null;

export function confirmAction(message: string, yesLabel: string, onYes: () => void): void {
  text.textContent = message;
  yes.textContent = yesLabel;
  pending = onYes;
  card.style.display = "block";
}

export function bindConfirmCard(): void {
  yes.onclick = () => {
    card.style.display = "none";
    const action = pending;
    pending = null;
    action?.();
  };
  no.onclick = () => {
    card.style.display = "none";
    pending = null;
  };
}
