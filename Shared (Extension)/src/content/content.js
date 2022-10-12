"use strict";

import { Popover } from "./popover";
import { Toast } from "./toast";

import {
  isVisible,
  hasTextNode,
  hasInlineElement,
  once,
  scrollDidStop,
} from "./utils";

class App {
  _uid = 1;
  _sourceLanguage = undefined;
  _targetLanguage = undefined;
  _originalTexts = {};
  _translatedTexts = {};

  _toast = new Toast();

  _isProcessing = false;
  _shouldProcessAfterScrolling = false;
  _isShowingOriginal = false;

  constructor() {
    this._init();
  }

  _init() {
    if (!window.customElements.get("translate-popover")) {
      window.customElements.define("translate-popover", Popover);
    }
    this._setupListeners();
  }

  _setupListeners() {
    browser.runtime.onMessage.addListener(
      async (request, sender, sendResponse) => {
        if (!request) {
          return;
        }
        switch (request.method) {
          case "translate": {
            this._shouldProcessAfterScrolling = true;

            await this._translatePage(request);

            once(
              scrollDidStop(async () => {
                if (this._shouldProcessAfterScrolling) {
                  await this._translatePage({
                    sourceLanguage: this._sourceLanguage,
                    targetLanguage: this._targetLanguage,
                  });
                }
              }, 500)
            )();

            sendResponse();
            break;
          }
          case "getContentState": {
            if (this._isProcessing) {
              sendResponse({ result: { isProcessing: this._isProcessing } });
            } else if (Object.keys(this._originalTexts).length > 0) {
              sendResponse({
                result: {
                  sourceLanguage: this._sourceLanguage,
                  targetLanguage: this._targetLanguage,
                  isShowingOriginal: this._isShowingOriginal,
                },
              });
            } else {
              sendResponse(undefined);
            }
            break;
          }
          case "showOriginal": {
            this._shouldProcessAfterScrolling = false;
            this._isShowingOriginal = true;

            const elements = document.querySelectorAll(
              '[data-wtdl-translated="true"]'
            );
            for (const element of elements) {
              const uid = element.dataset.wtdlUid;
              const originalText = this._originalTexts[uid];
              element.innerHTML = originalText;
              element.dataset.wtdlTranslated = "false";
            }
            sendResponse();
            break;
          }
          case "startTranslateSelection": {
            const selection = window.getSelection();
            const textRange = selection.getRangeAt(0);
            const selectionRect = textRange.getBoundingClientRect();

            let x = selectionRect.left + window.scrollX;
            let y = selectionRect.bottom + window.scrollY + 30;

            const position = this._getExistingPopoverPosition();
            const popover = this._createPopover(position || { x, y });
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
          case "getSelection": {
            const selection = window.getSelection();
            sendResponse({
              result: selection ? selection.toString() : undefined,
            });
            break;
          }
          case "ping": {
            sendResponse({ result: "pong" });
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

  _createPopover(position) {
    const id = "translate-popover";
    (() => {
      let popover = document.getElementById(id);
      if (popover) {
        popover.remove();
      }
    })();

    document.body.insertAdjacentHTML(
      "beforeend",
      `<translate-popover id="${id}"></translate-popover>`
    );
    const popover = document.getElementById(id);
    popover.setAttribute("position", JSON.stringify(position));

    const onClick = (event) => {
      if (event.target.closest(id)) {
        return;
      }
      popover.remove();
      document.removeEventListener("click", onClick);
    };

    document.addEventListener("click", onClick);
    popover.addEventListener("close", async () => {
      popover.remove();
      document.removeEventListener("click", onClick);
    });
    popover.addEventListener("change", async (event) => {
      await browser.storage.local.set(event.detail);

      const request = {
        method: "translateSelection",
        selectionText: event.detail.selectionText,
      };
      browser.runtime.sendMessage(request);
    });

    return popover;
  }

  _getExistingPopoverPosition() {
    const id = "translate-popover";
    const popover = document.getElementById(id);
    if (popover) {
      return popover.getPosition();
    }
    return undefined;
  }

  async _translatePage(request) {
    const translatedElements = document.querySelectorAll(
      '[data-wtdl-translated="false"]'
    );
    if (this._targetLanguage === request.targetLanguage) {
      // Restore translated texts
      for (const element of translatedElements) {
        const uid = element.dataset.wtdlUid;
        const translatedText = this._translatedTexts[uid];
        element.innerHTML = translatedText;
        element.dataset.wtdlTranslated = "true";
      }
    }

    const visibleElements = await collectVisibleElements();
    if (visibleElements.length === 0) {
      this._cancelTranslation();
      return;
    }
    this._startTranslation();

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
        this._sourceLanguage = result.lang;
        this._targetLanguage = request.targetLanguage;

        const translatedTexts = result.texts;
        if (translatedTexts.length === visibleElements.length) {
          for (let i = 0; i < visibleElements.length; i++) {
            const element = visibleElements[i].element;
            const text = translatedTexts[i].text;
            const uid = element.dataset.wtdlUid || this._uid++;

            if (element.dataset.wtdlOriginal !== "true") {
              this._originalTexts[uid] = element.innerHTML;
            }
            this._translatedTexts[uid] = text;
            element.innerHTML = text;

            element.dataset.wtdlUid = `${uid}`;
            element.dataset.wtdlOriginal = "true";
            element.dataset.wtdlTranslated = "true";
          }
        }
      }
    }

    this._finishTranslation();
  }

  _startTranslation() {
    this._toast.show();

    this._isProcessing = true;
    this._isShowingOriginal = false;

    browser.runtime.sendMessage({
      method: "startTranslation",
    });
  }

  _cancelTranslation() {
    this._isShowingOriginal = false;

    browser.runtime.sendMessage({
      method: "cancelTranslation",
      result: {
        sourceLanguage: this._sourceLanguage,
        targetLanguage: this._targetLanguage,
      },
    });
  }

  _finishTranslation() {
    this._isProcessing = false;
    this._toast.close();

    browser.runtime.sendMessage({
      method: "finishTranslation",
      result: {
        sourceLanguage: this._sourceLanguage,
        targetLanguage: this._targetLanguage,
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

new App();
