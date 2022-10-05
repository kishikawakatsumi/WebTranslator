"use strict";

import { Popover } from "./popover";
import { Toast } from "./toast";

import {
  isVisible,
  hasTextNode,
  hasInlineElement,
  once,
  debounce,
  scrollStop,
} from "./utils";

new App();

class App {
  #uid = 1;
  #sourceLanguage = undefined;
  #targetLanguage = undefined;
  #originalTexts = {};
  #translatedTexts = {};

  #toast = new Toast();

  #isProcessing = false;
  #shouldProcessAfterScrolling = false;
  #isShowingOriginal = false;

  constructor() {
    this.#init();
  }

  #init() {
    if (!window.customElements.get("translate-popover")) {
      window.customElements.define("translate-popover", Popover);
    }
    this.#setupListeners();
  }

  #setupListeners() {
    browser.runtime.onMessage.addListener(
      async (request, sender, sendResponse) => {
        if (!request) {
          return;
        }
        switch (request.method) {
          case "translate": {
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
            break;
          }
          case "getContentState": {
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
            break;
          }
          case "showOriginal": {
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
            break;
          }
          case "startTranslateSelection": {
            const selection = window.getSelection();
            const textRange = selection.getRangeAt(0);
            const clientRect = textRange.getBoundingClientRect();

            const popover = this.#createOrGetPopover({
              x: clientRect.x,
              y: clientRect.bottom + window.pageYOffset + 30,
            });
            popover.setAttribute("loading", true);

            sendResponse();
            break;
          }
          case "finishTranslateSelection": {
            const result = request.result;
            const popover = document.getElementById("translate-popover");
            if (popover) {
              if (result.result && result.result.texts) {
                const text = result.result.texts.map((t) => t.text).join("\n");
                popover.setAttribute("result", `${text}`);
                popover.setAttribute("lang", `${request.targetLanguage || ""}`);
              } else {
                if (result.error) {
                  const message = browser.i18n.getMessage(
                    "error_message_generic_error"
                  );
                  popover.setAttribute("error", message);
                } else {
                  const message = browser.i18n.getMessage(
                    "error_message_generic_error"
                  );
                  popover.setAttribute("error", message);
                }
              }
              popover.setAttribute("loading", false);
            }
            sendResponse();
            break;
          }
          default: {
            sendResponse();
            break;
          }
        }
      }
    );
  }

  #createOrGetPopover(position) {
    const id = "translate-popover";
    const popover = document.getElementById(id);
    if (popover) {
      return popover;
    } else {
      document.body.insertAdjacentHTML(
        "beforeend",
        `<translate-popover id="${id}"></translate-popover>`
      );
      const popover = document.getElementById(id);

      const onClick = (event) => {
        if (event.target.closest(id)) {
          return;
        }
        popover.remove();
        document.removeEventListener("click", onClick);
      };

      document.addEventListener("click", onClick);
      popover.on("close", async () => {
        popover.remove();
        document.removeEventListener("click", onClick);
      });
      popover.on("change", async (event) => {
        await chrome.storage.local.set(event.detail);

        const request = {
          method: "translateSelection",
          selectionText: event.detail.selectionText,
        };
        browser.runtime.sendMessage(request);
      });

      popover.setAttribute("position", JSON.stringify(position));

      return popover;
    }
  }

  async #translatePage(request) {
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
    if (visibleElements.length === 0) {
      this.#cancelTranslation();
      return;
    }
    this.#startTranslation();

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

    this.#finishTranslation();
  }

  #startTranslation() {
    this.#toast.show();

    this.#isProcessing = true;
    this.#isShowingOriginal = false;

    browser.runtime.sendMessage({
      method: "startTranslation",
    });
  }

  #cancelTranslation() {
    browser.runtime.sendMessage({
      method: "cancelTranslation",
    });
  }

  #finishTranslation() {
    browser.runtime.sendMessage({
      method: "finishTranslation",
      result: {
        sourceLanguage: this.#sourceLanguage,
        targetLanguage: this.#targetLanguage,
      },
    });

    this.#isProcessing = false;
    this.#toast.close();
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
