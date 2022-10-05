"use strict";

import { __decorate } from "tslib";
import { customElement } from "lit/decorators.js";
import { SnackbarBase } from "@material/mwc-snackbar/mwc-snackbar-base.js";
import { styles } from "@material/mwc-snackbar/mwc-snackbar.css.js";

let Snackbar = class Snackbar extends SnackbarBase {};
Snackbar.styles = [styles];
if (!window.customElements.get("mwc-snackbar")) {
  Snackbar = __decorate([customElement("mwc-snackbar")], Snackbar);
}

const progressMessage = browser.i18n.getMessage(
  "full_page_translation_ongoing_translation"
);

export class Toast {
  #snackbarStack = [];

  constructor() {}

  show() {
    if (this.#snackbarStack.length === 0) {
      const snackbar = createOrGetSnackbar();
      snackbar.show();
    }
    this.#snackbarStack.push(true);
  }

  close() {
    if (this.#snackbarStack.length === 1) {
      const snackbar = createOrGetSnackbar();
      snackbar.close();
    }
    this.#snackbarStack.pop();
  }
}

function createOrGetSnackbar() {
  const id = "mwc-snackbar";
  const snackber = document.getElementById(id);
  if (!snackber) {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<mwc-snackbar id="${id}" labelText="${progressMessage}..." timeoutMs="-1" closeOnEscape=false></mwc-snackbar>`
    );
    return document.getElementById(id);
  }
  return snackber;
}
