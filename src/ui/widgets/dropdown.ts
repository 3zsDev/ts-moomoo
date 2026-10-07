export interface DropdownItem<T = string> {
  value?: T;
  text?: string;
  disabled?: boolean;
  header?: string;
  section?: string;
  button?(face: HTMLElement): void;
  row?(row: HTMLElement): void;
}

export interface Dropdown<T = string> {
  set(items: DropdownItem<T>[], selected: T | null): void;
  isOpen(): boolean;
  close(): void;
}

export interface DropdownOptions<T> {
  label: string;
  onPick(value: T): void;
}

export function createDropdown<T = string>(host: HTMLElement, options: DropdownOptions<T>): Dropdown<T> {
  host.classList.add("dropdown");

  const button = document.createElement("div");
  button.className = "dropdownButton";
  button.tabIndex = 0;
  button.setAttribute("role", "combobox");
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-label", options.label);

  const face = document.createElement("span");
  face.className = "dropdownFace";
  const chevron = document.createElement("i");
  chevron.className = "material-icons dropdownChevron";
  chevron.innerHTML = "&#xE5CF;";
  button.append(face, chevron);

  const list = document.createElement("div");
  list.className = "dropdownList";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", options.label);
  host.append(button, list);

  let items: DropdownItem<T>[] = [];
  let selected: T | null = null;
  let active = -1;

  const isOpen = () => host.classList.contains("open");
  const pickable = (item: DropdownItem<T>) => !item.disabled && !item.header;

  function setActive(index: number): void {
    active = index;
    const rows = list.children;
    for (let i = 0; i < rows.length; i++) rows[i].classList.toggle("active", i === index);
    rows[index]?.scrollIntoView({ block: "nearest" });
  }

  function step(from: number, direction: number): number {
    for (let i = from + direction; i >= 0 && i < items.length; i += direction) {
      if (pickable(items[i])) return i;
    }
    return from;
  }

  function open(): void {
    if (isOpen() || !items.length) return;
    host.classList.add("open");
    button.setAttribute("aria-expanded", "true");
    const current = items.findIndex((item) => item.value === selected);
    setActive(current >= 0 ? current : step(-1, 1));
  }

  function close(): void {
    host.classList.remove("open");
    button.setAttribute("aria-expanded", "false");
  }

  function pick(index: number): void {
    const item = items[index];
    if (!item || !pickable(item)) return;
    close();
    if (item.value !== selected) options.onPick(item.value as T);
  }

  function render(): void {
    face.innerHTML = "";
    items.find((item) => item.value === selected)?.button?.(face);

    list.innerHTML = "";
    items.forEach((item, index) => {
      if (item.header) {
        const heading = document.createElement("div");
        heading.className = "dropdownHeader" + (item.section ? ` ${item.section}` : "");
        heading.textContent = item.header;
        list.appendChild(heading);
        return;
      }

      const isSelected = item.value === selected;
      const row = document.createElement("div");
      row.className =
        "dropdownRow" + (item.disabled ? " disabled" : "") + (isSelected ? " selected" : "") +
        (item.section ? ` ${item.section}` : "");
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", isSelected ? "true" : "false");
      if (item.disabled) row.setAttribute("aria-disabled", "true");
      item.row?.(row);

      row.addEventListener("click", (event) => {
        event.stopPropagation();
        pick(index);
      });
      row.addEventListener("mousemove", () => {
        if (!item.disabled && active !== index) setActive(index);
      });
      list.appendChild(row);
    });

    if (isOpen()) setActive(Math.min(active, items.length - 1));
  }

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    if (isOpen()) close();
    else open();
  });

  button.addEventListener("keydown", (event) => {
    const key = event.key;
    event.stopPropagation();

    if (!isOpen()) {
      if (key === "Enter" || key === " " || key === "ArrowDown" || key === "ArrowUp") {
        event.preventDefault();
        open();
      }
      return;
    }

    if (key === "Escape" || key === "Tab") close();
    else if (key === "ArrowDown") {
      event.preventDefault();
      setActive(step(active, 1));
    } else if (key === "ArrowUp") {
      event.preventDefault();
      setActive(step(active, -1));
    } else if (key === "Home") {
      event.preventDefault();
      setActive(step(-1, 1));
    } else if (key === "End") {
      event.preventDefault();
      setActive(step(items.length, -1));
    } else if (key === "Enter" || key === " ") {
      event.preventDefault();
      pick(active);
    } else if (key.length === 1) {
      const letter = key.toLowerCase();
      for (let offset = 1; offset <= items.length; offset++) {
        const index = (active + offset) % items.length;
        const item = items[index];
        if (pickable(item) && (item.text ?? "").toLowerCase().startsWith(letter)) {
          setActive(index);
          break;
        }
      }
    }
  });

  button.addEventListener("blur", () => {
    setTimeout(() => {
      if (document.activeElement !== button) close();
    }, 150);
  });

  document.addEventListener("click", (event) => {
    if (!host.contains(event.target as Node)) close();
  });

  return {
    set(next, value) {
      items = next;
      selected = value;
      render();
    },
    isOpen,
    close,
  };
}
