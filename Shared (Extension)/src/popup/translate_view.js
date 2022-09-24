"use strict";

import { supportedLanguages } from "./supported_languages";

export class TranslateView extends EventTarget {
  #languageSelectLabel;
  #languageSelect;
  #translateButton;

  #showOriginalButton;

  constructor() {
    super();
    this.#init();
  }

  setSelectedTargetLanguage(language) {
    if (
      language &&
      supportedLanguages.some(
        (supportedLanguage) => supportedLanguage.code === language.toUpperCase()
      )
    ) {
      this.#languageSelect.value = language;
    }
  }

  setHidden(hidden) {
    document
      .getElementById("translate-view")
      .classList.toggle("d-hide", hidden);
  }

  setLoading(loading) {
    if (loading) {
      this.showInitialView();

      this.#languageSelect.disabled = true;
      this.#translateButton.disabled = true;
      this.#translateButton.classList.add("loading");
    } else {
      this.#languageSelect.disabled = false;
      this.#translateButton.disabled = false;
      this.#translateButton.classList.remove("loading");
    }
  }

  showInitialView() {
    document.getElementById("initial-view").classList.remove("d-hide");
    document.getElementById("result-view").classList.add("d-hide");
  }

  showResultView(sourceLanguage, targetLanguage) {
    document.getElementById("initial-view").classList.add("d-hide");
    document.getElementById("result-view").classList.remove("d-hide");

    document.getElementById("translation-message").textContent =
      browser.i18n.getMessage("full_page_translation_auto_translate_message");
    document.getElementById("translation-source-lang").textContent =
      browser.i18n.getMessage(
        `supported_languages_${sourceLanguage.toUpperCase()}`
      );
  }

  on(type, listener) {
    this.addEventListener(type, listener);
  }

  #init() {
    this.#languageSelectLabel = document.getElementById(
      "language-select-label"
    );
    this.#languageSelectLabel.textContent = browser.i18n.getMessage(
      "ui_target_language_select"
    );

    const locale = browser.i18n
      .getUILanguage()
      .split("-")
      .shift()
      .toUpperCase();
    this.#languageSelect = document.getElementById("language-select");
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

    this.#translateButton = document.getElementById("translate-button");
    this.#translateButton.textContent = browser.i18n.getMessage(
      "full_page_translation_menu_translate_button"
    );
    this.#translateButton.addEventListener("click", (event) => {
      this.#onTranslateButtonClick(event);
      return false;
    });

    this.#showOriginalButton = document.getElementById("show-original-button");
    this.#showOriginalButton.textContent = browser.i18n.getMessage(
      "full_page_translation_show_original"
    );
    this.#showOriginalButton.addEventListener("click", (event) => {
      this.#onShowOriginalButtonClick(event);
      return false;
    });
  }

  #onLanguageSelectChange() {
    this.dispatchEvent(
      new CustomEvent("change", {
        detail: {
          selectedSourceLanguage: undefined,
          selectedTargetLanguage: this.#languageSelect.value,
        },
      })
    );
  }

  #onTranslateButtonClick() {
    this.dispatchEvent(
      new CustomEvent("translate", {
        detail: {
          sourceLanguage: undefined,
          targetLanguage: this.#languageSelect.value,
        },
      })
    );
  }

  #onShowOriginalButtonClick() {
    this.dispatchEvent(new CustomEvent("showOriginal"));
  }
}
