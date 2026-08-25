const KNOWN_EXTENSIONS = [
  { name: "Tampermonkey", id: "dhdgffkkebhmkfjojejmpbldmpobfkfo", resource: "options.html" },
  { name: "Tampermonkey", id: "gcalenpjmijncebpfijmoaglllgpjagf", resource: "options.html" },
  { name: "Tampermonkey", id: "iikmkjmpaadaobahmlepeloendndfphd", resource: "options.html" },
  { name: "Violentmonkey", id: "jinjaccalgkegednnccohejagnlnfdag", resource: "options.html" },
];

const INJECTED_GLOBALS = ["__gmMonkey", "GM_info", "GM", "unsafeWindow"];

export function detectUserscripts(): void {
  let reported = false;
  const report = (name: string) => {
    if (reported) return;
    reported = true;
    showWarning(name);
  };

  for (const extension of KNOWN_EXTENSIONS) {
    try {
      const probe = new Image();
      probe.onload = () => report(extension.name);

      probe.src = `chrome-extension://${extension.id}/${extension.resource}?_=${Date.now()}`;
    } catch {}
  }

  window.setTimeout(() => {
    try {
      const scope = window as unknown as Record<string, unknown>;
      if (INJECTED_GLOBALS.some((key) => scope[key])) report("a userscript manager");
    } catch {}
  }, 1500);
}

function showWarning(detectedName: string): void {
  const render = () => {
    if (document.getElementById("userscript-warning")) return;

    const banner = document.createElement("div");
    banner.id = "userscript-warning";
    banner.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "right:0",
      "z-index:2147483647",
      "background:#c0392b",
      "color:#fff",
      "font-family:Hammersmith One, sans-serif",
      "font-size:16px",
      "text-align:center",
      "padding:12px 16px",
      "box-shadow:0 2px 8px rgba(0,0,0,.4)",
    ].join(";");
    banner.textContent =
      `A browser extension (${detectedName || "userscript manager"}) that can modify ` +
      "the game was detected. Please disable it and reload to play fairly.";

    const reload = document.createElement("a");
    reload.textContent = " Reload";
    reload.href = "#";
    reload.style.cssText = "color:#fff;text-decoration:underline;margin-left:8px;font-weight:bold";
    reload.onclick = (event) => {
      event.preventDefault();
      window.location.reload();
    };
    banner.appendChild(reload);

    document.body.appendChild(banner);
  };

  if (document.body) render();
  else window.addEventListener("DOMContentLoaded", render);
}
