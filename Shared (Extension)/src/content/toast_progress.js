"use strict";

import "@nordhealth/components/lib/Stack";
import "@nordhealth/components/lib/Toast";
import "@nordhealth/components/lib/ToastGroup";

export class ToastProgress extends HTMLElement {
  #toastStack = [];

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  static get observedAttributes() {
    return ["show"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "show":
        if (newValue === "true") {
          this.#show();
        } else {
          this.#dismiss();
        }
        break;
    }
  }

  #show() {
    if (this.#toastStack.length === 0) {
      const group = createToastGroup();
      group.addToast(`${progressMessage()}...`, { autoDismiss: -1 });

      retouchToastAppearance();
    }
    this.#toastStack.push(true);
  }

  #dismiss() {
    if (this.#toastStack.length === 1) {
      dismissToast();
    }
    this.#toastStack.pop();
  }
}

function createToastGroup() {
  const id = "nord-toast-group-progress";
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

function getToastGroup() {
  return document.getElementById("nord-toast-group-progress");
}

function progressMessage() {
  return browser.i18n.getMessage("full_page_translation_ongoing_translation");
}

function retouchToastAppearance() {
  const group = getToastGroup();
  if (group) {
    const toast = group.querySelector("nord-toast");
    if (toast) {
      toast.innerHTML = `<nord-stack direction="horizontal" gap="m" align-items="center"><nord-stack class="container"><svg width="24" height="24" fill="#fff" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10.72,19.9a8,8,0,0,1-6.5-9.79A7.77,7.77,0,0,1,10.4,4.16a8,8,0,0,1,9.49,6.52A1.54,1.54,0,0,0,21.38,12h.13a1.37,1.37,0,0,0,1.38-1.54,11,11,0,1,0-12.7,12.39A1.54,1.54,0,0,0,12,21.34h0A1.47,1.47,0,0,0,10.72,19.9Z"><animateTransform attributeName="transform" type="rotate" dur="0.75s" values="0 12 12;360 12 12" repeatCount="indefinite"/></path></svg></nord-stack><nord-stack class="progress-message">${progressMessage()}...</nord-stack></nord-stack>`;

      toast.querySelector(".container").style.width = "24px";
      toast.querySelector(".container").style.height = "24px";

      toast.querySelector(".progress-message").style.fontSize = "14px";
      toast.querySelector(".progress-message").style.color = "#fff";

      const shadowRoot = toast.shadowRoot;
      if (shadowRoot) {
        requestAnimationFrame(() => {
          const toastInner = shadowRoot.querySelector(".n-toast");
          if (toastInner) {
            const dismissButton = toastInner.querySelector(".n-dismiss");
            if (dismissButton) {
              dismissButton.style.visibility = "hidden";
            }
          }
        });
      }
    }
  }
}

function dismissToast() {
  let success = false;
  const group = getToastGroup();
  if (group) {
    const toast = group.querySelector("nord-toast");
    if (toast) {
      const shadowRoot = toast.shadowRoot;
      if (shadowRoot) {
        const toastInner = shadowRoot.querySelector(".n-toast");
        if (toastInner) {
          const dismissButton = toastInner.querySelector(".n-dismiss");
          if (dismissButton) {
            dismissButton.click();
            success = true;
          }
        }
      }
    }
  }
  if (!success) {
    const group = getToastGroup();
    if (group) {
      group.remove();
    }
  }
}
