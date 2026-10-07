import {
  hasCaptchaToken, isTurnstileApiReady, isTurnstileScriptBlocked, onTurnstileEvent, retryTurnstile,
  turnstileState,
} from "../../net/turnstile";
import { hookTouchEvents } from "../../utils/dom";
import { ui } from "../elements";
// captcha menu

const SHOW_DELAY = 1500;
const WATCHDOG_TIME = 15000;

const TEXT = {
  checking: "Checking you're human...",
  interactive: "One quick check before you play.",
  failed: "Verification failed. Check your connection and try again.",
  blocked:
    "The human check couldn't load. Tracking protection or an ad blocker may be blocking " +
    "challenges.cloudflare.com: allow it for this site (or turn the blocker off here) and try again. " +
    "Signed-in players skip this check.",
};

let pendingPlay: (() => void) | null = null;
let onShown: (() => void) | null = null;
let showTimer: ReturnType<typeof setTimeout> | undefined;
let watchdog: ReturnType<typeof setTimeout> | undefined;

export function isVerifyDialogOpen(): boolean {
  return ui.verifyDialog.classList.contains("showing");
}

function show(): void {
  onShown?.();
  onShown = null;
  if (!isTurnstileApiReady() && isTurnstileScriptBlocked()) turnstileState.blocked = true;

  const { blocked, failed, interactive } = turnstileState;
  ui.verifyText.textContent = blocked
    ? TEXT.blocked
    : failed
      ? TEXT.failed
      : interactive
        ? TEXT.interactive
        : TEXT.checking;
  ui.verifyRetry.style.display = failed || blocked ? "" : "none";
  ui.verifyDialog.classList.add("showing");
  ui.verifyBackdrop.classList.add("showing");
  (document.activeElement as HTMLElement | null)?.blur?.();

  clearTimeout(watchdog);
  if (!failed && !blocked && !interactive) {
    watchdog = setTimeout(() => {
      if (!pendingPlay || hasCaptchaToken() || turnstileState.interactive) return;
      if (isTurnstileApiReady()) turnstileState.failed = true;
      else turnstileState.blocked = true;
      show();
    }, WATCHDOG_TIME);
  }
}

export function hideVerifyDialog(): void {
  clearTimeout(watchdog);
  ui.verifyDialog.classList.remove("showing");
  ui.verifyBackdrop.classList.remove("showing");
}

function cancel(): void {
  pendingPlay = null;
  onShown = null;
  clearTimeout(showTimer);
  hideVerifyDialog();
}

export function awaitVerification(onReady: () => void, onWaiting: () => void): void {
  pendingPlay = onReady;
  onShown = onWaiting;
  clearTimeout(showTimer);
  showTimer = setTimeout(() => {
    if (pendingPlay) show();
  }, SHOW_DELAY);
}

export function bindVerifyDialog(): void {
  onTurnstileEvent((event) => {
    if (event === "token") {
      hideVerifyDialog();
      clearTimeout(showTimer);
      const play = pendingPlay;
      pendingPlay = null;
      onShown = null;
      play?.();
      return;
    }
    if (event !== "expired" && pendingPlay) show();
  });

  ui.verifyRetry.onclick = () => {
    retryTurnstile();
    show();
  };
  hookTouchEvents(ui.verifyRetry);

  ui.verifyClose.onclick = cancel;
  hookTouchEvents(ui.verifyClose);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isVerifyDialogOpen()) cancel();
  });
}
