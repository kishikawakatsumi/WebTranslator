"use strict";

import { Translator } from "./translator";

class App {
  #selectionText = undefined;

  constructor() {
    this.#init();
  }

  #init() {
    this.#setupListeners();
    this.#setupContextMenu();
  }

  #setupListeners() {
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (!request) {
        return;
      }
      switch (request.method) {
        case "translate": {
          const texts = request.texts;
          translate(texts, request.sourceLanguage, request.targetLanguage)
            .then((result) => {
              browser.tabs.query(
                { active: true, currentWindow: true },
                (tabs) => {
                  browser.tabs.sendMessage(tabs[0].id, {
                    method: "responseTranslate",
                    targetLanguage: request.targetLanguage,
                    key: request.key,
                    result,
                  });
                }
              );
              sendResponse();
            })
            .catch((error) => {
              sendResponse();
            });
          break;
        }
        case "translateSelection": {
          const selectionText = this.#selectionText;
          if (request.selectionText && request.selectionText.trim()) {
            // From popup toolbar (Mobile only)
            this.#translateSelection(request.selectionText);
          } else if (selectionText && selectionText.trim()) {
            // Language changed in popover window
            this.#translateSelection(selectionText);
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

    browser.commands.onCommand.addListener((command) => {
      if (command === "trigger-translation") {
        browser.storage.local.get(["settingsReadingShortcut"], (result) => {
          const settingsReadingShortcut =
            result.settingsReadingShortcut === undefined ||
            result.settingsReadingShortcut;
          if (settingsReadingShortcut) {
            browser.tabs
              .executeScript({
                code: `window.getSelection().toString();`,
              })
              .then((selection) => {
                if (selection) {
                  const selectionText = selection.toString().trim();
                  if (selectionText) {
                    this.#translateSelection(selectionText);
                  }
                }
              });
          }
        });
      }
    });
  }

  #setupContextMenu() {
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
              this.#translateSelection(selectionText);
            }
        }
      });
    }
  }

  async #translateSelection(selectionText) {
    this.#selectionText = selectionText;
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
