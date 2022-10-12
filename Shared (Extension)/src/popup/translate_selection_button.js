"use strict";

export class TranslateSelectionButton extends EventTarget {
  _translateSelectionButton;

  constructor() {
    super();
    this._init();
  }

  setLoading(loading) {
    if (loading) {
      this._translateSelectionButton.setAttribute("loading", loading);
    } else {
      this._translateSelectionButton.removeAttribute("loading");
    }
  }

  setEnabled(enabled) {
    this._translateSelectionButton.disabled = !enabled;
  }

  on(type, listener) {
    this.addEventListener(type, listener);
  }

  _init() {
    this._translateSelectionButton = document.getElementById(
      "translate-selection-button"
    );
    this._translateSelectionButton.textContent = browser.i18n.getMessage(
      "context_menus_translate_section"
    );
    this._translateSelectionButton.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("click"));
    });
  }
}
