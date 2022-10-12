"use strict";

import { Translator } from "./translator";

class App {
  _selectionText = undefined;

  constructor() {
    this._init();
  }

  _init() {
    this._setupListeners();
    this._setupContextMenu();
  }

  _setupListeners() {
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (!request) {
        return;
      }
      switch (request.method) {
        case "translate": {
          const texts = request.texts;
          translate(texts, request.sourceLanguage, request.targetLanguage)
            .then((result) => {
              sendResponse({ result });
            })
            .catch((error) => {
              sendResponse();
            });
          break;
        }
        case "translateSelection": {
          const selectionText = this._selectionText;
          if (request.selectionText && request.selectionText.trim()) {
            // From popup toolbar (Mobile only)
            this._translateSelection(request.selectionText);
          } else if (selectionText && selectionText.trim()) {
            // Language changed in popover window
            this._translateSelection(selectionText);
          }

          sendResponse();
          break;
        }
        default: {
          sendResponse();
          break;
        }
      }

      return true;
    });
  }

  _setupContextMenu() {
    if (browser.menus.create) {
      browser.menus.create({
        id: "translateSelection",
        title: browser.i18n.getMessage("context_menus_translate_section"),
        contexts: ["editable", "link", "page", "selection"],
      });

      browser.menus.onClicked.addListener(async (info, tab) => {
        switch (info.menuItemId) {
          case "translateSelection":
            const selectionText = info.selectionText;
            if (selectionText && selectionText.trim()) {
              this._translateSelection(selectionText);
            }
        }
      });
    }
  }

  async _translateSelection(selectionText) {
    this._selectionText = selectionText;
    const targetLanguage = await getTargetLanguage();

    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      browser.tabs.sendMessage(tabs[0].id, {
        method: "startTranslateSelection",
        selectionText,
      });
    });

    const result = await translate(
      [selectionText],
      undefined,
      targetLanguage,
      false
    );

    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      browser.tabs.sendMessage(tabs[0].id, {
        method: "finishTranslateSelection",
        result,
        targetLanguage,
      });
    });
    browser.runtime.sendMessage({
      method: "finishTranslateSelection",
    });
  }
}

async function translate(
  texts,
  sourceLanguage,
  targetLanguage,
  isHtmlEnabled = true
) {
  const translator = new Translator();
  translator.setSourceLanguage(sourceLanguage);
  translator.setTargetLanguage(targetLanguage);

  const result = await translator.translate(texts, isHtmlEnabled);
  return result;
}

async function getTargetLanguage() {
  return new Promise((resolve, reject) => {
    browser.storage.local.get(["selectedTargetLanguage"], (result) => {
      if (result && result.selectedTargetLanguage) {
        resolve(result.selectedTargetLanguage);
      } else {
        const locale = browser.i18n
          .getUILanguage()
          .split("-")
          .shift()
          .toUpperCase();
        resolve(locale);
      }
    });
  });
}

new App();
