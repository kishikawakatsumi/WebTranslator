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

async function translate(texts, sourceLanguage, targetLanguage) {
  const translator = new Translator();
  translator.setSourceLanguage(sourceLanguage);
  translator.setTargetLanguage(targetLanguage);

  const result = await translator.translate(texts);
  return result;
}
