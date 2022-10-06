"use strict";

import { supportedLanguages } from "../shared/supported_languages";
import { makeDraggable } from "./draggable";
import { escapeHTML } from "./utils";

const styleSheetPath = browser.runtime.getURL("assets/content.css");

const template = `<style>
  @import url(${styleSheetPath});

  .translate-popover {
    position: absolute;
    border-radius: 5px;
    box-shadow: 0px 2px 16px rgba(0, 0, 0, 0.16);
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
    left: calc(50% - 2.1875rem);
    top: .5rem;
  }
  .close-button {
    position: absolute;
    right: 0;
    top: 0;
  }
  .translate-content {
    padding: 0.8rem;
  }
  #result {
    max-height: 300px;
    overflow: auto;
    line-height: 1.6em;
  }
</style>

<div class="translate-popover card" id="draggable" style="width: 550px;">
  <button class="close-button btn btn-clear btn-lg m-1" id="close-button"></button>
  <div class="title-bar c-move" id="dragzone">
    <div class="drag-handle"></div>
  </div>
  <div class="translate-content">
    <div class="input-group">
      <label class="form-label text-tiny pt-2 pr-2" for="language-select" id="language-select-label">Translate to:</label>
      <select class="form-select select-sm m-1 px-2" id="language-select" style="font-size: 0.9em;">
      </select>
    </div>
    <div class="divider"></div>
    <div class="py-2">
      <div class="loading loading-lg" id="spinner"></div>
      <div class="text-small d-none" id="result"></div>
    </div>
  </div>
</div>`;

export class Popover extends HTMLElement {
  #draggable;
  #closeButton;
  #languageSelect;
  #result;
  #spinner;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });

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

    const languageSelectLabel = this.shadowRoot.getElementById(
      "language-select-label"
    );
    languageSelectLabel.textContent = browser.i18n.getMessage(
      "layout_header_label_language_switch"
    );

    const locale = browser.i18n
      .getUILanguage()
      .split("-")
      .shift()
      .toUpperCase();
    this.#languageSelect = this.shadowRoot.getElementById("language-select");
    for (const supportedLanguage of supportedLanguages) {
      const option = new Option(
        browser.i18n.getMessage(
          `supported_languages_${supportedLanguage.code}`
        ),
        supportedLanguage.code,
        false,
        supportedLanguage.code === locale
      );
      this.#languageSelect.add(option);
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
