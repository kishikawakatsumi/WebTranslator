"use strict";

import "./nord.css";
import "@nordhealth/components/lib/Banner";
import "@nordhealth/components/lib/Button";
import "@nordhealth/components/lib/Divider";
import "@nordhealth/components/lib/Icon";
import "@nordhealth/components/lib/Select";
import "@nordhealth/components/lib/Spinner";
import "@nordhealth/components/lib/Stack";
import "@nordhealth/components/lib/Toast";
import "@nordhealth/components/lib/ToastGroup";

import { Popover } from "./popover";
import { Tooltip } from "./tooltip";
import { ToastProgress } from "./toast_progress";
import { ToastError } from "./toast_error";

window.customElements.define("translate-popover", Popover);
window.customElements.define("translate-button", Tooltip);
window.customElements.define("toast-progress", ToastProgress);
window.customElements.define("toast-error", ToastError);
