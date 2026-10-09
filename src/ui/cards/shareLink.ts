import { createElement } from "../../utils/dom";

export function copyLinkButton(parent: HTMLElement, path: string, status: HTMLElement): HTMLElement {
  return createElement({
    class: "friendAction",
    text: "Copy link",
    parent,
    onclick: () => {
      const url = location.origin + path;
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(
        () => (status.textContent = "Link copied"),
        () => (status.textContent = url),
      );
    },
  });
}
