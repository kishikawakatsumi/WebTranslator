"use strict";

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

const template = `<nord-stack class="translate-popover" gap="s" id="draggable">
  <nord-button variant="plain" class="close-button" id="close-button">
    <nord-icon>
      <svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
        <path d="M133 7 7 133M7 7l126 126" stroke-width="14" fill="none" stroke="currentColor" stroke-linecap="round"
          stroke-linejoin="round" />
      </svg>
    </nord-icon>
  </nord-button>

  <div class="title-bar c-move" id="dragzone">
    <svg class="drag-handle" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 70 6'>
      <path fill='#3f4145'
        d='M8 0h2v2H8zm8 0h2v2h-2zm8 0h2v2h-2zM12 0h2v2h-2zm8 0h2v2h-2zm8 0h2v2h-2zM8 4h2v2H8zm8 0h2v2h-2zm8 0h2v2h-2zM12 4h2v2h-2zm8 0h2v2h-2zm8 0h2v2h-2zM0 0h2v2H0zm4 0h2v2H4zM0 4h2v2H0zm4 0h2v2H4zm36-4h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2zM32 0h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2zm20-4h2v2h-2zm8 0h2v2h-2zm-4 0h2v2h-2zm8 0h2v2h-2zM56 4h2v2h-2zm8 0h2v2h-2zm-4 0h2v2h-2zm8 0h2v2h-2zM48 0h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2z' />
      </svg>
  </div>

  <nord-stack gap="s" class="translate-content">
    <nord-stack gap="s" class="gap-4">
      <nord-stack gap="s" class="padding-8">
        <nord-stack direction="horizontal" gap="s" align-items="center">
          <div id="language-select-label">Translate to:</div>
          <nord-select id="language-select" size="s" hide-label></nord-select>
        </nord-stack>

        <nord-divider></nord-divider>
      </nord-stack>

      <nord-stack id="spinner" align-items="center">
        <nord-spinner size="xl"></nord-spinner>
      </nord-stack>
      <div id="result" class="d-none"></div>
    </nord-stack>

    <nord-stack align-items="end" class="padding-2-8">
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

    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", browser.runtime.getURL("assets/popover.css"));
    this.shadowRoot.appendChild(link);
  }

  #render() {
    const popover = document.createElement("div");
    popover.innerHTML = template;
    this.shadow.append(popover);

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
      if (result && result.selectedTargetLanguage) {
        this.#setSelectedTargetLanguage(result.selectedTargetLanguage);
      }
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
        this.#result.innerHTML = `<nord-banner variant="danger">${newValue}</nord-banner>`;
        break;
      case "lang":
        this.#setSelectedTargetLanguage(newValue);
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
    this.#spinner.classList.toggle("d-none", !loading);
    this.#result.classList.toggle("d-none", loading);
  }

  #onLanguageSelectChange(event) {
    event.stopPropagation();
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
