"use strict";

import { Translator } from "./translator";

new App();

class App {
  #userDisplayName = undefined;

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
        if (request && request.method === "translate") {
          const texts = request.texts;
          const result = await translate(
            texts,
            request.sourceLanguage,
            request.targetLanguage
          );

          sendResponse({ result });
        } else if (request && request.method === "getLoginSession") {
          sendResponse({ result: this.#userDisplayName });
        } else {
          sendResponse();
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
            if (selectionText) {
              const locale = browser.i18n
                .getUILanguage()
                .split("-")
                .shift()
                .toUpperCase();
              const result = await translate(
                [selectionText],
                undefined,
                locale,
                false
              );
              browser.tabs.query(
                { active: true, currentWindow: true },
                (tabs) => {
                  browser.tabs.sendMessage(tabs[0].id, {
                    method: "translateSelection",
                    result,
                  });
                }
              );
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
