"use strict";

import { Popover } from "./popover";

function setup() {
  if (!window.customElements.get("translate-popover")) {
    window.customElements.define("translate-popover", Popover);
  }
}

setup();
