"use strict";

import { Translator } from "./translator";

new App();

class App {
  #userDisplayName = undefined;
  #selectionText = undefined;

  constructor() {
    this.#init();
    this.#getUserDisplayName();
  }

  #init() {
    this.#setupListeners();
    this.#setupAlarm();
    this.#setupContextMenu();
  }

  #setupListeners() {
    browser.runtime.onMessage.addListener(
      async (request, sender, sendResponse) => {
        if (!request) {
          return;
        }
        switch (request.method) {
          case "getLoginSession":
            sendResponse({ result: this.#userDisplayName });
            break;
          case "translate":
            const texts = request.texts;
            const result = await translate(
              texts,
              request.sourceLanguage,
              request.targetLanguage
            );

            sendResponse({ result });
            break;
          case "translateSelection":
            const selectionText = this.#selectionText;
            if (selectionText && selectionText.trim()) {
              this.#translateSelection(selectionText);
            }

            sendResponse({ result });
            break;
          default:
            sendResponse();
            break;
        }
      }
    );
  }

  #setupAlarm() {
    browser.alarms.create("getUserDisplayName", {
      periodInMinutes: 60,
    });
    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === "getUserDisplayName") {
        this.#getUserDisplayName();
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

  #getUserDisplayName() {
    const request = { method: "getUserDisplayName" };
    browser.runtime.sendNativeMessage("application.id", request, (response) => {
      if (response && response.result) {
        this.#userDisplayName = response.result;
      } else {
        this.#userDisplayName = undefined;
      }
    });
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
