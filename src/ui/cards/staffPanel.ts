import { account, postWithAuth } from "../../net/api";
import { createElement } from "../../utils/dom";

export interface StaffTarget {
  id?: string;
  name?: string;
  role?: string;
}

const REASONS = ["Cheating / hacks", "Botting / scripts", "Teaming / griefing", "Harassment / chat", "Offensive name", "Other"];

interface ModRecord {
  reports?: { session?: number; week?: number; lifetime?: number };
  flags?: { week: { total?: number }; lifetime: { total?: number; signals?: Record<string, number> } };
  verdict?: { level: string; reason?: string };
  session?: { at: number; server?: string; ip?: string };
  recent?: { by: { name?: string; kind?: string }; at: number; reason?: string }[];
}

function timeAgo(at: number): string {
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

function line(parent: HTMLElement, label: string, value: string): void {
  createElement({
    class: "staffLine",
    parent,
    children: [createElement({ tag: "label", text: label }), createElement({ tag: "span", text: value })],
  });
}

function fillRecord(info: HTMLElement, record: ModRecord | null): void {
  info.textContent = "";
  if (!record) {
    info.textContent = "No moderation record";
    return;
  }

  const reports = record.reports ?? {};
  line(info, "Reports",
    `${reports.session || 0} this session · ${reports.week || 0} this week · ${reports.lifetime || 0} total`);

  const flags = record.flags ?? { week: {}, lifetime: {} };
  const signals = Object.entries(flags.lifetime.signals ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, count]) => `${name.replace(/_/g, " ")} ${count}`)
    .join(", ");
  line(info, "Flags",
    `${flags.week.total || 0} this week · ${flags.lifetime.total || 0} total${signals ? ` (${signals})` : ""}`);

  if (record.verdict) {
    line(info, "Status", record.verdict.level + (record.verdict.reason ? `: ${record.verdict.reason}` : ""));
  }
  if (record.session) {
    const server = record.session.server ? ` on ${record.session.server.split(".")[0]}` : "";
    line(info, "Last played", timeAgo(record.session.at) + server);
    if (record.session.ip) line(info, "Last IP (hashed)", record.session.ip);
  }
  for (const report of (record.recent ?? []).slice(0, 5)) {
    const guest = report.by.kind === "guest" ? " (guest)" : "";
    const reason = report.reason ? ` for ${report.reason}` : "";
    line(info, "", `Reported by ${report.by.name || "unnamed"}${guest}${reason} · ${timeAgo(report.at)}`);
  }
}

function armedButton(
  parent: HTMLElement, label: string, path: string, body: () => object, status: HTMLElement,
): void {
  let armed = false;
  const button = createElement({
    class: "staffAction",
    text: label,
    parent,
    onclick: () => {
      if (!armed) {
        armed = true;
        button.textContent = `${label}?`;
        button.classList.add("armed");
        return;
      }
      postWithAuth(path, body())
        .then((response) => {
          status.textContent = response.ok ? `${label}: done` : response.status === 403 ? "Not allowed" : "Failed";
          armed = false;
          button.textContent = label;
          button.classList.remove("armed");
        })
        .catch(() => {
          status.textContent = "Failed";
        });
    },
  });
}

export function renderStaffPanel(actions: HTMLElement, status: HTMLElement, target: StaffTarget): void {
  actions.querySelector(".staffPanel")?.remove();

  const panel = createElement({ class: "staffPanel", parent: actions });
  const info = createElement({ class: "staffInfo", text: "Loading reports...", parent: panel });

  postWithAuth("/mod/player", target)
    .then((response) => (response.ok ? (response.json() as Promise<ModRecord>) : null))
    .then((record) => fillRecord(info, record))
    .catch(() => {
      info.textContent = "Couldn't load reports";
    });

  const reasonRow = createElement({ class: "staffReason", parent: panel });
  const select = createElement({ tag: "select", parent: reasonRow }) as HTMLSelectElement;
  for (const reason of REASONS) createElement({ tag: "option", text: reason, parent: select });
  const details = createElement({ tag: "input", parent: reasonRow }) as HTMLInputElement;
  details.placeholder = "Details (optional)";
  details.maxLength = 60;
  details.addEventListener("keydown", (event) => event.stopPropagation());

  const reason = () => {
    const extra = details.value.trim();
    return select.value === "Other" ? extra || "Other" : select.value + (extra ? `: ${extra}` : "");
  };
  const verdict = (extra: object) => () => ({ reason: reason(), ...target, ...extra });

  const buttons = createElement({ class: "staffButtons", parent: panel });
  armedButton(buttons, "Kick", "/mod/kick", verdict({}), status);
  armedButton(buttons, "Ban", "/mod/verdict", verdict({ level: "ban" }), status);
  armedButton(buttons, "IP ban", "/mod/verdict", verdict({ level: "ban", ip: true }), status);
  armedButton(buttons, "Shadow", "/mod/verdict", verdict({ level: "shadow" }), status);
  armedButton(buttons, "Clear", "/mod/verdict", verdict({ level: "clear", ip: true }), status);

  if (account.role === "admin" && target.name) {
    const name = target.name;
    if (target.role === "mod") armedButton(buttons, "Remove mod", "/mod/role", () => ({ name, role: "none" }), status);
    else if (!target.role) armedButton(buttons, "Make mod", "/mod/role", () => ({ name, role: "mod" }), status);
  }
}
