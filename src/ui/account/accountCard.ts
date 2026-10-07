import { auth } from "../../net/api";
import type { AuthError, CodeSession } from "../../net/api/auth";
import { byId, createElement, hookTouchEvents, removeAllChildren } from "../../utils/dom";
import { ui } from "../elements";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 30 * 1000;

const card = {
  root: byId("accountCard"),
  title: byId("accountTitle"),
  note: byId("accountNote"),
  email: byId<HTMLInputElement>("accountEmail", "input"),
  code: byId<HTMLInputElement>("accountCode", "input"),
  password: byId<HTMLInputElement>("accountPassword", "input"),
  status: byId("accountStatus"),
  submit: byId("accountSubmit"),
  linkA: byId("accountLinkA"),
  linkB: byId("accountLinkB"),
  close: byId("accountClose"),
};

let passwordMode = false;
let signUp = false;
let codeSession: CodeSession | null = null;
let busy = false;
let resendAt = 0;
let resendTimer: ReturnType<typeof setInterval> | undefined;
let callerNote = "";
let onSuccess: (() => void) | null = null;

function setShown(el: HTMLElement, on: boolean): void {
  el.style.display = on ? "" : "none";
}

function setLink(el: HTMLElement, text: string, action: (() => void) | null): void {
  el.textContent = text;
  el.style.display = text ? "" : "none";
  el.className = action ? "" : "disabled";
  el.onclick = action
    ? () => {
        if (busy) return;
        action();
        setStatus("");
        render();
      }
    : null;
}

function setStatus(text: string, error = false): void {
  card.status.textContent = text || "";
  card.status.className = error ? "error" : "";
}

function useCode(): void {
  passwordMode = false;
  codeSession = null;
}

function render(): void {
  const enteringCode = !passwordMode && codeSession !== null;

  card.title.textContent = passwordMode ? (signUp ? "Sign Up" : "Log In") : "Sign In or Sign Up";
  card.note.textContent = callerNote || (passwordMode ? "" : "New here? The code creates your account.");
  setShown(card.note, Boolean(card.note.textContent));
  setShown(card.email, !enteringCode);
  setShown(card.code, enteringCode);
  setShown(card.password, passwordMode);

  if (enteringCode) {
    const wait = Math.ceil((resendAt - Date.now()) / 1000);
    setLink(card.linkA, wait > 0 ? `Resend (${wait}s)` : "Resend", wait > 0 ? null : resend);
    setLink(card.linkB, "Change email", () => {
      codeSession = null;
    });
  } else if (passwordMode && signUp) {
    setLink(card.linkA, "Use a code", useCode);
    setLink(card.linkB, "Log in", () => {
      signUp = false;
    });
  } else if (passwordMode) {
    setLink(card.linkA, "Forgot password?", useCode);
    setLink(card.linkB, "Sign up", () => {
      signUp = true;
    });
  } else {
    setLink(card.linkA, "Use password instead", () => {
      passwordMode = true;
      signUp = false;
    });
    setLink(card.linkB, "", null);
  }
  card.linkB.parentElement?.classList.toggle("single", !card.linkB.textContent);
  card.password.autocomplete = signUp ? "new-password" : "current-password";

  const label = card.submit.getElementsByTagName("span")[0];
  if (label) {
    label.textContent = busy
      ? "..."
      : enteringCode
        ? "Continue"
        : passwordMode
          ? signUp ? "Sign Up" : "Log In"
          : "Send code";
  }
  card.submit.classList.toggle("disabled", busy);
}

function startResendCooldown(): void {
  resendAt = Date.now() + RESEND_COOLDOWN;
  clearInterval(resendTimer);
  resendTimer = setInterval(() => {
    if (Date.now() >= resendAt) clearInterval(resendTimer);
    render();
  }, 1000);
}

async function run(task: () => Promise<void>): Promise<void> {
  if (busy) return;
  busy = true;
  setStatus("");
  render();

  try {
    await task();
  } catch (error) {
    const kind = (error as AuthError).kind;
    if (kind === "expired") codeSession = null;
    if (kind === "other-method") {
      passwordMode = true;
      signUp = false;
    }
    setStatus((error as Error).message || "Something went wrong. Please try again.", true);
  }

  busy = false;
  render();
}

function resend(): void {
  const session = codeSession;
  if (!session) return;
  void run(async () => {
    await auth.resendCode(session);
    startResendCooldown();
    setStatus("Code sent");
  });
}

function readEmail(): string | null {
  const email = card.email.value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return email;
  setStatus("Enter your email.", true);
  card.email.focus();
  return null;
}

function finish(): void {
  const callback = onSuccess;
  closeAccountCard();
  callback?.();
}

function submit(): void {
  if (!passwordMode && codeSession) {
    const code = card.code.value.replace(/\D/g, "");
    if (code.length !== CODE_LENGTH) {
      setStatus(`Enter the ${CODE_LENGTH}-digit code.`, true);
      card.code.focus();
      return;
    }
    const session = codeSession;
    void run(async () => {
      await auth.submitCode(session, code);
      finish();
    });
    return;
  }

  const email = readEmail();
  if (!email) return;

  if (passwordMode) {
    const password = card.password.value;
    if (password.length < 8) {
      setStatus("8+ characters.", true);
      card.password.focus();
      return;
    }
    void run(async () => {
      if (signUp) await auth.passwordRegister(email, password);
      else await auth.passwordLogin(email, password);
      finish();
    });
    return;
  }

  void run(async () => {
    codeSession = await auth.requestCode(email);
    card.code.value = "";
    startResendCooldown();
    setStatus(`Code sent to ${email}`);
    setTimeout(() => card.code.focus(), 0);
  });
}

export function isAccountCardOpen(): boolean {
  return card.root.style.display === "block";
}

export function closeAccountCard(): void {
  card.root.style.display = "none";
  codeSession = null;
  onSuccess = null;
  card.password.value = "";
  card.code.value = "";
  clearInterval(resendTimer);
  setStatus("");
}

export function openAccountCard(note?: string, success?: () => void): void {
  onSuccess = success ?? null;
  callerNote = note ?? "";
  card.root.style.display = "block";
  render();
  setTimeout(() => card.email.focus(), 0);
}

function renderPlayAccount(): void {
  const signedIn = auth.isSignedIn();
  const label = ui.enterGameButton.getElementsByTagName("span")[0];
  if (label) label.textContent = signedIn ? "Enter Game" : "Play as Guest";

  const canSignIn = auth.signInAvailable();
  setShown(ui.signInButton, !signedIn && canSignIn);
  setShown(ui.signInHint, !signedIn && canSignIn);
  setShown(ui.accountRow, signedIn);

  removeAllChildren(ui.accountRow);
  if (signedIn) {
    createElement({
      tag: "a",
      class: "menuLink",
      text: "Sign out",
      onclick: () => void auth.signOut(),
      parent: ui.accountRow,
    });
  }
}

export function bindAccountCard(): void {
  card.submit.onclick = submit;
  hookTouchEvents(card.submit);
  card.close.onclick = closeAccountCard;
  hookTouchEvents(card.close);

  for (const input of [card.email, card.code, card.password]) {
    input.addEventListener("keydown", (event) => {
      if ((event.which || event.keyCode) === 13) submit();
      event.stopPropagation();
    });
  }

  card.code.addEventListener("input", () => {
    card.code.value = card.code.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (codeSession && !passwordMode && card.code.value.length === CODE_LENGTH) submit();
  });

  ui.signInButton.onclick = () => openAccountCard();
  hookTouchEvents(ui.signInButton);

  auth.onAuthChange(renderPlayAccount);
  renderPlayAccount();
}
