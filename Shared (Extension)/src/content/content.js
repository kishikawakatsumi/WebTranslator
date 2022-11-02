"use strict";

import {
  isVisible,
  isHidden,
  hasTextNode,
  hasNoBlockElement,
  once,
  scrollDidStop,
  isTouchDevice,
} from "./utils";

class App {
  #uid = 1;
  #sourceLanguage = undefined;
  #targetLanguage = undefined;
  #originalTexts = {};
  #translatedTexts = {};

  #toastProgress = undefined;
  #toastError = undefined;

  #isProcessing = false;
  #shouldProcessAfterScrolling = false;
  #isShowingOriginal = false;

  constructor() {
    this.#init();
  }

  #init() {
    this.#restoreState();

    const popover = this.#getPopover();
    if (popover) {
      popover.remove();
    }
    const tooltip = document.getElementById("translate-button");
    if (tooltip) {
      tooltip.remove();
    }

    this.#toastProgress = this.#createToastProgress();
    this.#toastError = this.#createToastError();

    this.#setupListeners();
    if (isTouchDevice()) {
      this.#observeTextSelection();
    }
  }

  #restoreState() {
    const id = "__wtdl-global-data";
    const global = document.getElementById(id);
    if (global) {
      if (global.dataset.wtdlOriginalTexts) {
        try {
          this.#originalTexts = JSON.parse(global.dataset.wtdlOriginalTexts);
        } catch (error) {}
      }
      return;
    }
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div id="${id}" style="display: none;"></div>`
    );
  }

  #saveState() {
    const global = document.getElementById("__wtdl-global-data");
    if (global) {
      global.dataset.wtdlOriginalTexts = JSON.stringify(this.#originalTexts);
    }
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
              scrollDidStop(async () => {
                if (this.#shouldProcessAfterScrolling) {
                  await this.#translatePage({
                    sourceLanguage: this.#sourceLanguage,
                    targetLanguage: this.#targetLanguage,
                  });
                }
              }, 500)
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
              if (originalText === undefined) {
                continue;
              }
              element.innerHTML = originalText;
              element.dataset.wtdlTranslated = "false";
            }
            sendResponse();
            break;
          }
          case "startTranslateSelection": {
            const selection = window.getSelection();

            let position = this.#getExistingPopoverPosition();
            if (!position && selection.rangeCount) {
              const textRange = selection.getRangeAt(0);
              const selectionRect = textRange.getBoundingClientRect();

              const x = selectionRect.left + window.scrollX;
              const y = selectionRect.bottom + window.scrollY + 30;
              position = { x, y };
            }

            const popover = this.#createPopover(position);
            popover.setAttribute("loading", true);

            sendResponse();
            break;
          }
          case "finishTranslateSelection": {
            const result = request.result;
            const popover = this.#getPopover();
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
          default: {
            sendResponse();
            break;
          }
        }
      }
    );

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && "selectedTargetLanguage" in changes) {
        const popover = this.#getPopover();
        if (popover) {
          popover.setAttribute("lang", changes.selectedTargetLanguage.newValue);
          browser.runtime.sendMessage({
            method: "translateSelection",
            selectionText: undefined,
          });
        }
      }
    });
  }

  #observeTextSelection() {
    document.addEventListener("pointerup", async (event) => {
      event.preventDefault();

      const selection = window.getSelection();
      if (!selection.rangeCount) {
        return;
      }
      let textRange = selection.getRangeAt(0).cloneRange();

      const selectionText = selection ? selection.toString().trim() : "";
      if (!selectionText && !selection.rangeCount) {
        this.#removeTooltip();
        return;
      }

      setTimeout(() => {
        textRange = selection.rangeCount
          ? selection.getRangeAt(0).cloneRange()
          : textRange;
        textRange.collapse(selection.anchorOffset > selection.focusOffset);
        const selectionRect = textRange.getBoundingClientRect();

        const x = selectionRect.right + window.scrollX - 20;
        const y = selectionRect.bottom + window.scrollY + 40;

        {
          const selection = window.getSelection();
          if (!selection || !selection.toString().trim()) {
            this.#removeTooltip();
            return;
          }
        }

        const tooltip = this.#createTooltip({ x, y });
        tooltip.addEventListener("tooltipClick", (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (selectionText) {
            browser.runtime.sendMessage({
              method: "translateSelection",
              selectionText,
            });
          }
          tooltip.remove();

          return false;
        });
      }, 100);
    });
  }

  #createTooltip(position) {
    const id = "translate-button";
    {
      const tooltip = document.getElementById(id);
      if (tooltip) {
        tooltip.remove();
      }
    }

    document.body.insertAdjacentHTML(
      "beforeend",
      `<translate-button id="${id}"></translate-button>`
    );
    const tooltip = document.getElementById(id);
    tooltip.setAttribute("position", JSON.stringify(position));

    document.addEventListener(
      "touchstart",
      (event) => {
        if (event.target.closest(id)) {
          return;
        }
        tooltip.remove();
      },
      { once: true }
    );

    return tooltip;
  }

  #removeTooltip() {
    const id = "translate-button";
    const tooltip = document.getElementById(id);
    if (tooltip) {
      tooltip.remove();
    }
  }

  #createToastProgress() {
    const id = "toast-progress";
    const toast = document.getElementById(id);
    if (toast) {
      toast.remove();
    }

    document.body.insertAdjacentHTML(
      "beforeend",
      `<toast-progress id="${id}"></toast-progress>`
    );
    return document.getElementById(id);
  }

  #createToastError() {
    const id = "toast-error";
    const toast = document.getElementById(id);
    if (toast) {
      toast.remove();
    }

    document.body.insertAdjacentHTML(
      "beforeend",
      `<toast-error id="${id}"></toast-error>`
    );
    return document.getElementById(id);
  }

  #createPopover(position) {
    const id = "translate-popover";
    {
      const popover = document.getElementById(id);
      if (popover) {
        popover.remove();
      }
    }

    document.body.insertAdjacentHTML(
      "beforeend",
      `<translate-popover id="${id}"></translate-popover>`
    );
    const popover = document.getElementById(id);
    popover.setAttribute("position", JSON.stringify(position));
    browser.storage.local.get(["selectedTargetLanguage"], (result) => {
      if (result && result.selectedTargetLanguage) {
        popover.setAttribute("lang", result.selectedTargetLanguage);
      }
    });

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
      await browser.storage.local.set({
        selectedSourceLanguage: undefined,
        selectedTargetLanguage: event.detail.selectedTargetLanguage,
      });
    });

    return popover;
  }

  #getPopover() {
    const id = "translate-popover";
    return document.getElementById(id);
  }

  #getExistingPopoverPosition() {
    const popover = this.#getPopover();
    if (popover) {
      const draggable = popover.shadowRoot.querySelector("#draggable");
      if (draggable) {
        return {
          x: draggable.offsetLeft,
          y: draggable.offsetTop,
        };
      }
    }
    return undefined;
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

    const handleError = (error) => {
      const message =
        error || browser.i18n.getMessage("error_message_generic_error");
      this.#abortTranslation(message);
    };

    if (!response || !response.result) {
      handleError();
      return;
    }
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

        this.#saveState();
      }
    } else if (response.result.error) {
      const message =
        response.result.error.code === 1045601
          ? browser.i18n.getMessage("error_message_quota_has_been_reached")
          : response.result.error.message;
      handleError(message);
      return;
    } else {
      handleError();
      return;
    }

    this.#finishTranslation();
  }

  #startTranslation() {
    this.#toastProgress.setAttribute("show", true);

    this.#isProcessing = true;
    this.#isShowingOriginal = false;

    browser.runtime.sendMessage({
      method: "startTranslation",
    });
  }

  #cancelTranslation() {
    this.#isShowingOriginal = false;

    browser.runtime.sendMessage({
      method: "cancelTranslation",
      result: {
        sourceLanguage: this.#sourceLanguage,
        targetLanguage: this.#targetLanguage,
      },
    });
  }

  #abortTranslation(errorMessage) {
    this.#isProcessing = false;
    this.#isShowingOriginal = false;

    this.#toastProgress.setAttribute("show", false);
    this.#toastError.setAttribute("show", errorMessage);

    browser.runtime.sendMessage({
      method: "abortTranslation",
      message: errorMessage,
    });
  }

  #finishTranslation() {
    this.#isProcessing = false;
    this.#toastProgress.setAttribute("show", false);

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
    const visible = isVisible(element);
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
    if (isHidden(element)) {
      continue;
    }
    if (element.nodeName === "svg") {
      continue;
    }
    if (hasTextNode(element)) {
      storage.push(element);
      continue;
    }
    if (hasNoBlockElement(element)) {
      storage.push(element);
      continue;
    }

    const children = element.children;
    if (!children || children.length === 0) {
      continue;
    }
    splitElements(element.children, storage);
  }
}

new App();
