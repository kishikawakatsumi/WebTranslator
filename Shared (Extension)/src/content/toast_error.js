"use strict";

import "./nord.css";
import "@nordhealth/components/lib/Stack";
import "@nordhealth/components/lib/Toast";
import "@nordhealth/components/lib/ToastGroup";

export class ToastError extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  static get observedAttributes() {
    return ["show", "dismiss"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "show":
        this.#show(newValue);
        break;
    }
  }

  #show(message) {
    const group = createToastGroup();
    group.addToast(message, { variant: "danger", autoDismiss: 8000 });
  }
}

function createToastGroup() {
  const id = "nord-toast-group-error";
  {
    const group = document.getElementById(id);
    if (group) {
      group.remove();
    }
  }

  document.body.insertAdjacentHTML(
    "beforeend",
    `<nord-toast-group id="${id}"></nord-toast-group>`
  );
  const group = document.getElementById(id);
  group.addEventListener("dismiss", (e) => e.target.remove());

  return document.getElementById(id);
}
