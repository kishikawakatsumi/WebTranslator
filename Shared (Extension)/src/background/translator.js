"use strict";

import { supportedLanguages } from "../shared/supported_languages";

export class Translator {
  #id = 1e4 * Math.round(1e4 * Math.random());

  #sourceLanguage;
  #targetLanguage;

  constructor() {}

  setSourceLanguage(sourceLanguage) {
    this.#sourceLanguage = sourceLanguage;
  }

  setTargetLanguage(targetLanguage) {
    this.#targetLanguage = targetLanguage;
  }

  async translate(texts, isHtmlEnabled = true) {
    this.#id++;

    let n = 1;
    for (const text of texts) {
      for (let i = 0; i < text.length; i++) {
        if (text[i] === "i") {
          n++;
        }
      }
    }

    let timestamp = Date.now();
    timestamp = timestamp - (timestamp % n) + n;

    let body = JSON.stringify({
      jsonrpc: "2.0",
      method: "LMT_handle_texts",
      params: {
        texts: texts.map((text) => {
          return {
            text,
          };
        }),
        html: isHtmlEnabled ? "enabled" : undefined,
        splitting: isHtmlEnabled ? undefined : "newlines",
        lang: {
          target_lang: isValidLanguage(this.#targetLanguage)
            ? this.#targetLanguage
            : supportedLanguages[0].code,
          source_lang_user_selected: this.#sourceLanguage || "auto",
        },
        timestamp,
      },
      id: this.#id,
    });
    body = body.replace(
      `"method":"`,
      `${
        (this.#id + 3) % 13 === 0 || (this.#id + 5) % 29 === 0
          ? `"method" : "`
          : `"method": "`
      }`
    );

    const request = {
      method: isHtmlEnabled ? "translate" : "translateSelection",
      payload: {
        headers: {
          Accept: "*/*",
          "x-app-os-name": "iOS",
          "Accept-Encoding": "gzip, deflate, br",
          "Content-Type": "application/json",
          Referer: "https://www.deepl.com/",
        },
        method: "POST",
        body: body,
      },
    };

    return new Promise((resolve) => {
      browser.runtime.sendNativeMessage(
        "application.id",
        request,
        (response) => {
          if (response && response.result) {
            resolve(JSON.parse(response.result));
          } else {
            resolve(undefined);
          }
        }
      );
    });
  }
}

function isValidLanguage(language) {
  return supportedLanguages.some((supportedLanguage) => {
    return supportedLanguage.code === language;
  });
}
