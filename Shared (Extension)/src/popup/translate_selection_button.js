"use strict";

export class TranslateSelectionButton extends EventTarget {
  #translateSelectionButton;

  constructor() {
    super();
    this.#init();
  }

  setLoading(loading) {
    if (loading) {
      this.#translateSelectionButton.setAttribute("loading", loading);
    } else {
      this.#translateSelectionButton.removeAttribute("loading");
    }
  }

  setEnabled(enabled) {
    this.#translateSelectionButton.disabled = !enabled;
  }

  on(type, listener) {
    this.addEventListener(type, listener);
  }

  #init() {
    this.#translateSelectionButton = document.getElementById(
      "translate-selection-button"
    );
    this.#translateSelectionButton.textContent = browser.i18n.getMessage(
      "context_menus_translate_section"
    );
    this.#translateSelectionButton.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("click"));
    });
  }
}
