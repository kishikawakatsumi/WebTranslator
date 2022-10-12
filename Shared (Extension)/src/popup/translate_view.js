"use strict";

import { supportedLanguages } from "../shared/supported_languages";

export class TranslateView extends EventTarget {
  _languageSelect;
  _translateButton;

  _showOriginalButton;

  constructor() {
    super();
    this._init();
  }

  setSelectedTargetLanguage(language) {
    if (
      language &&
      supportedLanguages.some(
        (supportedLanguage) => supportedLanguage.code === language.toUpperCase()
      )
    ) {
      this._languageSelect.value = language;
    }
  }

  setHidden(hidden) {
    document
      .getElementById("translate-view")
      .classList.toggle("d-hide", hidden);
  }

  setEnabled(enabled) {
    this._translateButton.disabled = !enabled;
  }

  setLoading(loading) {
    this._languageSelect.disabled = loading;
    if (loading) {
      this.showInitialView();
      this._translateButton.setAttribute("loading", loading);
    } else {
      this._translateButton.removeAttribute("loading");
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
      ) || "Unknown";
  }

  on(type, listener) {
    this.addEventListener(type, listener);
  }

  _init() {
    this._languageSelect = document.getElementById("language-select");
    this._languageSelect.label = browser.i18n.getMessage(
      "ui_target_language_select"
    );
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

    this._translateButton = document.getElementById("translate-button");
    this._translateButton.textContent = browser.i18n.getMessage(
      "full_page_translation_menu_translate_button"
    );
    this._translateButton.addEventListener("click", (event) => {
      this._onTranslateButtonClick(event);
    });

    this._showOriginalButton = document.getElementById("show-original-button");
    this._showOriginalButton.textContent = browser.i18n.getMessage(
      "full_page_translation_show_original"
    );
    this._showOriginalButton.addEventListener("click", (event) => {
      this._onShowOriginalButtonClick(event);
    });
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

  _onTranslateButtonClick() {
    this.dispatchEvent(
      new CustomEvent("translate", {
        detail: {
          sourceLanguage: undefined,
          targetLanguage: this._languageSelect.value,
        },
      })
    );
  }

  _onShowOriginalButtonClick() {
    this.dispatchEvent(new CustomEvent("showOriginal"));
  }
}
