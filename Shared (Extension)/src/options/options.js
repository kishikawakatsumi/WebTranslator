"use strict";

import "./nord.css";
import "@nordhealth/components/lib/Card";
import "@nordhealth/components/lib/Header";
import "@nordhealth/components/lib/Icon";
import "@nordhealth/components/lib/NavGroup";
import "@nordhealth/components/lib/NavItem";
import "@nordhealth/components/lib/Stack";
import "@nordhealth/components/lib/Toggle";

import "./options.css";

const settingsHeader = document.getElementById("settings-header");
settingsHeader.textContent = browser.i18n.getMessage("settings_title");

{
  const toggle = document.getElementById("reading-icon-toggle");
  toggle.label = browser.i18n.getMessage(
    "settings_reading_enable_icon_everywhere_label"
  );
  toggle.hint = browser.i18n.getMessage(
    "settings_reading_enable_icon_everywhere_description"
  );
  toggle.addEventListener("change", () => {
    browser.storage.local.set({
      settingsShowsIconForReading: toggle.checked,
    });
  });

  browser.runtime.getPlatformInfo().then((info) => {
    toggle.disabled = info.os !== "ios";
  });
  browser.storage.local.get(["settingsShowsIconForReading"], (result) => {
    if (result.settingsShowsIconForReading === undefined) {
      toggle.checked = true;
    } else {
      toggle.checked = result.settingsShowsIconForReading;
    }
  });
}
{
  const toggle = document.getElementById("reading-shortcut-toggle");
  toggle.label = browser.i18n.getMessage("settings_reading_shortcut_label");
  toggle.addEventListener("change", () => {
    browser.storage.local.set({
      settingsReadingShortcut: toggle.checked,
    });
  });
  browser.storage.local.get(["settingsReadingShortcut"], (result) => {
    if (result.settingsReadingShortcut === undefined) {
      toggle.checked = true;
    } else {
      toggle.checked = result.settingsReadingShortcut;
    }
  });
}

const feedback = document.getElementById("nav-feedback");
feedback.textContent = browser.i18n.getMessage("menu_feedback_label");
feedback.addEventListener("click", (event) => {
  event.preventDefault();
  browser.tabs.create({
    url: "https://forms.gle/rGdfU5Kr9QtzPWtv5",
  });
});

requestAnimationFrame(() => {
  // Workaround for Safari 14
  const toggles = document.querySelectorAll("nord-toggle");
  if (toggles) {
    for (const toggle of toggles) {
      const style = document.createElement("style");
      style.innerHTML = `.n-toggle::before { width: 18px; height: 18px; }`;
      toggle.shadowRoot.appendChild(style);
    }
  }

  // Workaround for iOS not showing the icon
  const card = document.querySelector("nord-card");
  if (card) {
    const group = card.querySelector("nord-nav-group");
    if (group) {
      const navItem = group.querySelector("nord-nav-item");
      if (navItem) {
        const icon = navItem.shadowRoot.querySelector("nord-icon");
        if (icon) {
          const div = icon.shadowRoot.querySelector('div[aria-hidden="true"]');
          if (div) {
            if (!div.querySelector("svg")) {
              div.insertAdjacentHTML(
                "beforeend",
                `<svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M133 91a14 14 0 0 1-14 14H70l-35 28v-28H21A14 14 0 0 1 7 91V21A14 14 0 0 1 21 7h98a14 14 0 0 1 14 14z"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="14"
    ></path>
  </svg>`
              );
            }
          }
        }
      }
    }
  }
});
