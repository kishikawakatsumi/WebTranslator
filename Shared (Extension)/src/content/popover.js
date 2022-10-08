"use strict";

import "./nord.css";
import "@nordhealth/components";

import { supportedLanguages } from "../shared/supported_languages";
import { makeDraggable } from "./draggable";
import { escapeHTML } from "./utils";
import { runColorMode, loadColorScheme } from "../shared/utils";

const template = `<style>
  :not(:defined) {
    visibility: hidden;
  }
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

  @media screen and (max-width: 767px) {
    .translate-popover {
      width: 300px;
    }
  }

  .title-bar {
    height: 1rem;
  }

  .drag-handle {
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 70 6'%3E%3Cpath fill='%233f4145' d='M8 0h2v2H8zm8 0h2v2h-2zm8 0h2v2h-2zM12 0h2v2h-2zm8 0h2v2h-2zm8 0h2v2h-2zM8 4h2v2H8zm8 0h2v2h-2zm8 0h2v2h-2zM12 4h2v2h-2zm8 0h2v2h-2zm8 0h2v2h-2zM0 0h2v2H0zm4 0h2v2H4zM0 4h2v2H0zm4 0h2v2H4zm36-4h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2zM32 0h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2zm20-4h2v2h-2zm8 0h2v2h-2zm-4 0h2v2h-2zm8 0h2v2h-2zM56 4h2v2h-2zm8 0h2v2h-2zm-4 0h2v2h-2zm8 0h2v2h-2zM48 0h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    content: "";
    display: block;
    position: absolute;
    height: 1rem;
    width: 4.375rem;
    top: .5rem;
    left: calc(50% - 2.1875rem);
    cursor: move;
  }

  .close-button {
    position: absolute;
    top: 0;
    right: 0;
  }

  .translate-content {
    padding: 0.8rem;
  }

  #result {
    max-height: 300px;
    overflow: auto;
    line-height: 1.6em;
  }

  .d-none,
  .d-hide {
    display: none !important;
  }
</style>

<nord-stack class="translate-popover n-reset" gap="s" id="draggable">
  <nord-button variant="plain" class="close-button" id="close-button">
    <nord-icon>
      <svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
        <path d="M133 7 7 133M7 7l126 126" stroke-width="14" fill="none" stroke="currentColor" stroke-linecap="round"
          stroke-linejoin="round" /></svg>
    </nord-icon>
  </nord-button>

  <div class="title-bar c-move" id="dragzone">
    <div class="drag-handle"></div>
  </div>

  <nord-stack gap="s" class="translate-content">
    <nord-stack direction="horizontal" gap="s" align-items="center">
      <div id="language-select-label">Translate to:</div>
      <nord-select id="language-select" size="s" hide-label></nord-select>
    </nord-stack>

    <nord-divider></nord-divider>

    <nord-stack align-items="center">
      <nord-spinner size="xl" id="spinner"></nord-spinner>
    </nord-stack>
    <div class="d-none" id="result"></div>

    <nord-stack align-items="end">
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
  #draggable;
  #closeButton;
  #languageSelect;
  #result;
  #spinner;
  #copyButton;

  #rendered = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  #render() {
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

    this.#draggable = this.shadowRoot.getElementById("draggable");
    const dragzone = this.shadowRoot.getElementById("dragzone");
    makeDraggable(this.#draggable, dragzone);

    this.#closeButton = this.shadowRoot.querySelector("#close-button");
    this.#closeButton.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("close"));
    });

    this.#result = this.shadowRoot.getElementById("result");
    this.#spinner = this.shadowRoot.getElementById("spinner");

    this.#copyButton = this.shadowRoot.getElementById("copy-button");
    this.#copyButton.disabled = navigator.clipboard === undefined;
    this.#copyButton.addEventListener("click", () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(this.#result.textContent);
      }
    });

    const languageSelectLabel = this.shadowRoot.getElementById(
      "language-select-label"
    );
    languageSelectLabel.textContent = browser.i18n.getMessage(
      "layout_header_label_language_switch"
    );
    this.#languageSelect = this.shadowRoot.getElementById("language-select");
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
      this.#languageSelect.appendChild(option);
    }
    this.#languageSelect.addEventListener(
      "change",
      this.#onLanguageSelectChange.bind(this)
    );

    browser.storage.local.get(["selectedTargetLanguage"], (result) => {
      this.#setSelectedTargetLanguage(result.selectedTargetLanguage);
    });
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && "selectedTargetLanguage" in changes) {
        this.#setSelectedTargetLanguage(
          changes.selectedTargetLanguage.newValue
        );
      }
    });
  }

  connectedCallback() {
    if (!this.#rendered) {
      this.#render();
      this.#rendered = true;
    }
  }

  static get observedAttributes() {
    return ["loading", "position", "result", "error", "lang"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "loading":
        this.#setLoading(newValue === "true");
        break;
      case "position":
        const { x, y } = JSON.parse(newValue);
        this.#setPosition(x, y);
        break;
      case "result":
        this.#result.innerHTML = escapeHTML(newValue).split("\n").join("<br>");
        break;
      case "error":
        this.#result.innerHTML = `<span class="text-error">${newValue}</span>`;
        break;
      case "lang":
        for (const c of this.#result.classList) {
          if (c.startsWith("lang-")) {
            this.#result.classList.remove(c);
          }
        }
        if (newValue === "ZH") {
          this.#result.classList.add(`lang-zh-hans`);
        } else if (newValue === "JA") {
          this.#result.classList.add(`lang-ja`);
        }
        break;
    }
  }

  #setSelectedTargetLanguage(language) {
    if (
      language &&
      supportedLanguages.some(
        (supportedLanguage) => supportedLanguage.code === language.toUpperCase()
      )
    ) {
      this.#languageSelect.value = language;
    }
  }

  #setPosition(x, y) {
    this.#draggable.style.top = `${y}px`;
    this.#draggable.style.left = `${x}px`;
  }

  #setLoading(loading) {
    if (loading) {
      this.#spinner.classList.remove("d-none");
      this.#result.classList.add("d-none");
    } else {
      this.#spinner.classList.add("d-none");
      this.#result.classList.remove("d-none");
    }
  }

  #onLanguageSelectChange(event) {
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: {
          selectedSourceLanguage: undefined,
          selectedTargetLanguage: this.#languageSelect.value,
        },
      })
    );
  }
}
