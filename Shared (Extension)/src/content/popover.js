"use strict";

import "./nord.css";
import "@nordhealth/components/lib/Banner";
import "@nordhealth/components/lib/Button";
import "@nordhealth/components/lib/Divider";
import "@nordhealth/components/lib/Icon";
import "@nordhealth/components/lib/Select";
import "@nordhealth/components/lib/Spinner";
import "@nordhealth/components/lib/Stack";

import { supportedLanguages } from "../shared/supported_languages";
import { makeDraggable } from "./draggable";
import { escapeHTML } from "./utils";
import { runColorMode, loadColorScheme } from "../shared/utils";

const template = `<style>
  * {
    -webkit-tap-highlight-color: transparent;
  }
  html {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
  .translate-popover {
    width: 550px;
    position: absolute;
    border-radius: 5px;
    box-shadow: 0px 2px 16px rgba(0, 0, 0, 0.16);
    z-index: 9998;
  }

  @media screen and (max-width: 767px) {
    .translate-popover {
      width: 300px;
    }
  }

  @media (prefers-color-scheme: light) {
    .translate-popover {
      background: #fff;
    }
  }
  @media (prefers-color-scheme: dark) {
    .translate-popover {
      background: rgb(24, 27, 32);
    }
  }

  .title-bar {
    height: 16px;
    cursor: move;
  }

  .drag-handle {
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 70 6'%3E%3Cpath fill='%233f4145' d='M8 0h2v2H8zm8 0h2v2h-2zm8 0h2v2h-2zM12 0h2v2h-2zm8 0h2v2h-2zm8 0h2v2h-2zM8 4h2v2H8zm8 0h2v2h-2zm8 0h2v2h-2zM12 4h2v2h-2zm8 0h2v2h-2zm8 0h2v2h-2zM0 0h2v2H0zm4 0h2v2H4zM0 4h2v2H0zm4 0h2v2H4zm36-4h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2zM32 0h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2zm20-4h2v2h-2zm8 0h2v2h-2zm-4 0h2v2h-2zm8 0h2v2h-2zM56 4h2v2h-2zm8 0h2v2h-2zm-4 0h2v2h-2zm8 0h2v2h-2zM48 0h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    content: "";
    display: block;
    position: absolute;
    height: 16px;
    width: 70px;
    top: .5rem;
    left: calc(50% - 35px);
  }

  .close-button {
    position: absolute;
    top: 0;
    right: 0;
  }

  .translate-content {
    padding-top: 0.8rem;
    padding-bottom: 0.8rem;
  }

  #result {
    max-height: 300px;
    overflow: auto;
    line-height: 1.6em;
    padding-left: 0.8rem;
    padding-right: 0.8rem;
  }

  .d-none,
  .d-hide {
    display: none !important;
  }
</style>

<nord-stack class="translate-popover" gap="s" id="draggable">
  <nord-button variant="plain" class="close-button" id="close-button">
    <nord-icon>
      <svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
        <path d="M133 7 7 133M7 7l126 126" stroke-width="14" fill="none" stroke="currentColor" stroke-linecap="round"
          stroke-linejoin="round" />
      </svg>
    </nord-icon>
  </nord-button>

  <div class="title-bar c-move" id="dragzone">
    <div class="drag-handle"></div>
  </div>

  <nord-stack gap="s" class="translate-content" style="padding-top: 0.2rem;">
    <nord-stack gap="s" style="gap: 4px;">
      <nord-stack gap="s" style="padding-left: 0.8rem; padding-right: 0.8rem;">
        <nord-stack direction="horizontal" gap="s" align-items="center">
          <div id="language-select-label" style="font-size: 12px;">Translate to:</div>
          <nord-select id="language-select" size="s" hide-label></nord-select>
        </nord-stack>

        <nord-divider></nord-divider>
      </nord-stack>

      <nord-stack id="spinner" align-items="center" style="padding-top: 8px; padding-bottom: 8px;">
        <nord-spinner size="xl"></nord-spinner>
      </nord-stack>
      <div id="result" class="d-none" style="font-size: 14px;"></div>
    </nord-stack>

    <nord-stack align-items="end" style="padding-top: 0.2rem; padding-left: 0.8rem; padding-right: 0.8rem;">
      <nord-button size="s" id="copy-button">
        <nord-icon>
          <svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
            <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="14">
              <path d="M7 7h98v98H7z" />
              <path d="M133 36.078V119a14 14 0 0 1-14 14H36.078" />
            </g>
          </svg>
        </nord-icon>
      </nord-button>
    </nord-stack>
  </nord-stack>
</nord-stack>`;

export class Popover extends HTMLElement {
  _draggable;
  _closeButton;
  _languageSelect;
  _result;
  _spinner;
  _copyButton;

  _rendered = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  _render() {
    const popover = document.createElement("div");
    popover.innerHTML = template;
    this.shadow.append(popover);

    runColorMode((isDarkMode) => {
      loadColorScheme(
        isDarkMode
          ? browser.runtime.getURL("assets/nord-dark.css")
          : browser.runtime.getURL("assets/nord.css")
      );
    });

    this._draggable = this.shadowRoot.getElementById("draggable");
    const dragzone = this.shadowRoot.getElementById("dragzone");
    makeDraggable(this._draggable, dragzone);

    this._closeButton = this.shadowRoot.querySelector("#close-button");
    this._closeButton.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("close"));
    });

    this._result = this.shadowRoot.getElementById("result");
    this._spinner = this.shadowRoot.getElementById("spinner");

    this._copyButton = this.shadowRoot.getElementById("copy-button");
    this._copyButton.disabled = navigator.clipboard === undefined;
    this._copyButton.addEventListener("click", () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(this._result.textContent);
      }
    });

    const languageSelectLabel = this.shadowRoot.getElementById(
      "language-select-label"
    );
    languageSelectLabel.textContent = browser.i18n.getMessage(
      "layout_header_label_language_switch"
    );
    this._languageSelect = this.shadowRoot.getElementById("language-select");
    const locale = browser.i18n
      .getUILanguage()
      .split("-")
      .shift()
      .toUpperCase();
    for (const supportedLanguage of supportedLanguages) {
      const option = new Option(
        browser.i18n.getMessage(
          `supported_languages_${supportedLanguage.code}`
        ),
        supportedLanguage.code,
        false,
        supportedLanguage.code === locale
      );
      this._languageSelect.appendChild(option);
    }
    this._languageSelect.addEventListener(
      "change",
      this._onLanguageSelectChange.bind(this)
    );

    browser.storage.local.get(["selectedTargetLanguage"], (result) => {
      this._setSelectedTargetLanguage(result.selectedTargetLanguage);
    });
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && "selectedTargetLanguage" in changes) {
        this._setSelectedTargetLanguage(
          changes.selectedTargetLanguage.newValue
        );
      }
    });
  }

  connectedCallback() {
    if (!this._rendered) {
      this._render();
      this._rendered = true;
    }
  }

  static get observedAttributes() {
    return ["loading", "position", "result", "error", "lang"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "loading":
        this._setLoading(newValue === "true");
        break;
      case "position":
        const { x, y } = JSON.parse(newValue);
        this._setPosition(x, y);
        break;
      case "result":
        this._result.innerHTML = escapeHTML(newValue).split("\n").join("<br>");
        break;
      case "error":
        this._result.innerHTML = `<nord-banner variant="danger">${newValue}</nord-banner>`;
        break;
      case "lang":
        this._setSelectedTargetLanguage(newValue);
        break;
    }
  }

  getPosition() {
    return { x: this._draggable.offsetLeft, y: this._draggable.offsetTop };
  }

  _setSelectedTargetLanguage(language) {
    if (
      language &&
      supportedLanguages.some(
        (supportedLanguage) => supportedLanguage.code === language.toUpperCase()
      )
    ) {
      this._languageSelect.value = language;
    }
  }

  _setPosition(x, y) {
    this._draggable.style.top = `${y}px`;
    this._draggable.style.left = `${x}px`;
  }

  _setLoading(loading) {
    this._spinner.classList.toggle("d-none", !loading);
    this._result.classList.toggle("d-none", loading);
  }

  _onLanguageSelectChange() {
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: {
          selectedSourceLanguage: undefined,
          selectedTargetLanguage: this._languageSelect.value,
        },
      })
    );
  }
}
