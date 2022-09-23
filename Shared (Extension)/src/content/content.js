"use strict";

import {
  isVisible,
  hasTextNode,
  hasInlineElement,
  once,
  debounce,
  scrollStop,
} from "./utils.js";

new App();

class App {
  #uid = 1;
  #sourceLanguage = undefined;
  #targetLanguage = undefined;
  #originalTexts = {};
  #translatedTexts = {};

  #isProcessing = false;
  #shouldProcessAfterScrolling = false;
  #isShowingOriginal = false;

  constructor() {
    this.#init();
  }

  #init() {
    this.#setupListeners();
  }

  #setupListeners() {
    browser.runtime.onMessage.addListener(
      async (request, sender, sendResponse) => {
        if (request && request.method === "translate") {
          this.#shouldProcessAfterScrolling = true;

          await this.#translatePage(request);

          once(
            scrollStop(async () => {
              const translatePage = debounce(async () => {
                await this.#translatePage({
                  sourceLanguage: this.#sourceLanguage,
                  targetLanguage: this.#targetLanguage,
                });
              }, 250);

              if (this.#shouldProcessAfterScrolling) {
                translatePage();
              }
            })
          )();

          sendResponse();
        } else if (request && request.method === "getContentState") {
          if (this.#isProcessing) {
            sendResponse({ result: { isProcessing: this.#isProcessing } });
          } else if (Object.keys(this.#originalTexts).length > 0) {
            sendResponse({
              result: {
                sourceLanguage: this.#sourceLanguage,
                targetLanguage: this.#targetLanguage,
                isShowingOriginal: this.#isShowingOriginal,
              },
            });
          } else {
            sendResponse(undefined);
          }
        } else if (request && request.method === "showOriginal") {
          this.#shouldProcessAfterScrolling = false;
          this.#isShowingOriginal = true;

          const elements = document.querySelectorAll(
            '[data-wtdl-translated="true"]'
          );
          for (const element of elements) {
            const uid = element.dataset.wtdlUid;
            const originalText = this.#originalTexts[uid];
            element.innerHTML = originalText;
            element.dataset.wtdlTranslated = "false";
          }
          sendResponse();
        } else {
          sendResponse();
        }
      }
    );
  }

  async #translatePage(request) {
    this.#startTranslation();

    const translatedElements = document.querySelectorAll(
      '[data-wtdl-translated="false"]'
    );
    if (this.#targetLanguage === request.targetLanguage) {
      // Restore translated texts
      for (const element of translatedElements) {
        const uid = element.dataset.wtdlUid;
        const translatedText = this.#translatedTexts[uid];
        element.innerHTML = translatedText;
        element.dataset.wtdlTranslated = "true";
      }
    }

    const visibleElements = await collectVisibleElements();
    if (visibleElements.length > 0) {
      const texts = visibleElements.map((element) => element.text);

      const response = await browser.runtime.sendMessage({
        method: "translate",
        texts,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
      });

      if (response && response.result) {
        const result = response.result.result;
        if (result && result.texts) {
          this.#sourceLanguage = result.lang;
          this.#targetLanguage = request.targetLanguage;

          const translatedTexts = result.texts;
          if (translatedTexts.length === visibleElements.length) {
            for (let i = 0; i < visibleElements.length; i++) {
              const element = visibleElements[i].element;
              const text = translatedTexts[i].text;

              const uid = this.#uid++;
              this.#originalTexts[uid] = element.innerHTML;
              this.#translatedTexts[uid] = text;
              element.innerHTML = text;

              element.dataset.wtdlUid = `${uid}`;
              element.dataset.wtdlOriginal = "true";
              element.dataset.wtdlTranslated = "true";
            }
          }
        }
      }
    }

    this.#finishTranslation();
  }

  #startTranslation() {
    this.#isProcessing = true;
    this.#isShowingOriginal = false;

    browser.runtime.sendMessage({
      method: "startTranslation",
    });
  }

  #finishTranslation() {
    this.#isProcessing = false;

    browser.runtime.sendMessage({
      method: "finishTranslation",
      result: {
        sourceLanguage: this.#sourceLanguage,
        targetLanguage: this.#targetLanguage,
      },
    });
  }
}

async function collectVisibleElements() {
  const blockElements = [];

  const children = document.body.children;
  splitElements(children, blockElements);

  const visibleElements = [];
  for (const element of blockElements) {
    const visible = await isVisible(element);
    if (
      visible &&
      (element.dataset.wtdlUid === undefined ||
        element.dataset.wtdlTranslated === "false")
    ) {
      visibleElements.push({ element, text: element.innerHTML });
    }
  }

  return visibleElements;
}

function splitElements(elements, storage) {
  for (const element of elements) {
    if (hasTextNode(element) || hasInlineElement(element)) {
      storage.push(element);
    } else {
      const children = element.children;
      if (!children || children.length === 0) {
        continue;
      }
      splitElements(element.children, storage);
    }
  }
}
