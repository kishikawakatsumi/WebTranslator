"use strict";

import { Popover } from "./popover";
import { Tooltip } from "./tooltip";
import { ToastProgress } from "./toast_progress";
import { ToastError } from "./toast_error";

window.customElements.define("translate-popover", Popover);
window.customElements.define("translate-button", Tooltip);
window.customElements.define("toast-progress", ToastProgress);
window.customElements.define("toast-error", ToastError);
