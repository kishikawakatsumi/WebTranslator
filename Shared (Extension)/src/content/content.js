"use strict";

import "node-snackbar/dist/snackbar.min.css";
import Snackbar from "node-snackbar/dist/snackbar.min.js";

import {
  isVisible,
  hasTextNode,
  hasInlineElement,
  once,
  debounce,
  scrollStop,
} from "./utils.js";

const progressMessage = browser.i18n.getMessage(
  "full_page_translation_ongoing_translation"
);
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

  #snackbarStack = [];

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
              const uid = element.dataset.wtdlUid || this.#uid++;

              if (element.dataset.wtdlOriginal !== "true") {
                this.#originalTexts[uid] = element.innerHTML;
              }
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
    if (this.#snackbarStack.length === 0) {
      Snackbar.show({
        text: `<svg width="24" height="24" fill="#fff" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10.72,19.9a8,8,0,0,1-6.5-9.79A7.77,7.77,0,0,1,10.4,4.16a8,8,0,0,1,9.49,6.52A1.54,1.54,0,0,0,21.38,12h.13a1.37,1.37,0,0,0,1.38-1.54,11,11,0,1,0-12.7,12.39A1.54,1.54,0,0,0,12,21.34h0A1.47,1.47,0,0,0,10.72,19.9Z"><animateTransform attributeName="transform" type="rotate" dur="0.75s" values="0 12 12;360 12 12" repeatCount="indefinite"/></path></svg><span style="line-height: 24px; vertical-align: top; padding: 0 12px 0 12px; font-size: 1.2em;">${progressMessage}...</span>`,
        actionText: `<span style="line-height: 14px; font-size: 1.8em;">\u00D7</span>`,
        actionTextColor: "#fff",
        pos: "bottom-center",
        duration: undefined,
      });
    }
    this.#snackbarStack.push(true);

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

    if (this.#snackbarStack.length === 1) {
      Snackbar.close();
    }
    this.#snackbarStack.pop();
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
        element.dataset.wtdlTranslated === "false") &&
      !element.parentElement.classList.contains("snackbar-container")
    ) {
      visibleElements.push({ element, text: element.innerHTML });
    }
  }

  return visibleElements;
}

function splitElements(elements, storage) {
  for (const element of elements) {
    if (
      (hasTextNode(element) || hasInlineElement(element)) &&
      element.clientHeight < window.innerHeight
    ) {
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
