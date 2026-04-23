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

browser.runtime.onMessage.addListener((request) => {
  if (
    request &&
    request.method === "openUniversalLink" &&
    typeof request.url === "string"
  ) {
    try {
      showUniversalLinkOverlay(request.url);
    } catch (_) {}
  }
});

function showUniversalLinkOverlay(url) {
  const existing = document.getElementById("wt-ul-overlay");
  if (existing) existing.remove();

  // 全画面 dim をせず、透明な scrim をアウトサイドタップ検知に使うだけ。
  // セーフエリアに暗色が届かない違和感を避けるため背景色は透明。
  const scrim = document.createElement("div");
  scrim.id = "wt-ul-overlay";
  scrim.setAttribute(
    "style",
    [
      "position:fixed !important",
      "inset:0 !important",
      "margin:0 !important",
      "padding:24px !important",
      "background:transparent !important",
      "z-index:2147483647 !important",
      "display:flex !important",
      "align-items:center !important",
      "justify-content:center !important",
      "box-sizing:border-box !important",
    ].join(";")
  );
  scrim.addEventListener("click", (event) => {
    if (event.target === scrim) scrim.remove();
  });

  const card = document.createElement("div");
  card.setAttribute(
    "style",
    [
      "all:revert",
      "position:relative !important",
      "box-sizing:border-box !important",
      "max-width:320px !important",
      "width:100% !important",
      "margin:0 !important",
      "padding:28px 20px 20px !important",
      "background:#ffffff !important",
      "color:#111827 !important",
      "border-radius:14px !important",
      "box-shadow:0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08) !important",
      "font-family:system-ui,-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif !important",
    ].join(";")
  );

  const closeButton = document.createElement("button");
  closeButton.setAttribute("aria-label", "Close");
  closeButton.textContent = "×";
  closeButton.setAttribute(
    "style",
    [
      "all:revert",
      "position:absolute !important",
      "top:6px !important",
      "right:6px !important",
      "inline-size:32px !important",
      "block-size:32px !important",
      "margin:0 !important",
      "padding:0 !important",
      "border:none !important",
      "background:transparent !important",
      "color:#6b7280 !important",
      "font-family:system-ui,-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif !important",
      "font-size:22px !important",
      "line-height:1 !important",
      "border-radius:8px !important",
      "cursor:pointer !important",
    ].join(";")
  );
  closeButton.addEventListener("click", () => scrim.remove());

  const title = document.createElement("div");
  title.textContent = "Sign in to DeepL";
  title.setAttribute(
    "style",
    [
      "all:revert",
      "margin:0 0 6px !important",
      "padding:0 !important",
      "color:#111827 !important",
      "font-family:system-ui,-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif !important",
      "font-size:17px !important",
      "font-weight:600 !important",
      "line-height:1.3 !important",
      "text-align:left !important",
    ].join(";")
  );

  const description = document.createElement("div");
  description.textContent =
    "Open the app to complete sign-in. You'll be returned to Safari when finished.";
  description.setAttribute(
    "style",
    [
      "all:revert",
      "margin:0 0 18px !important",
      "padding:0 !important",
      "color:#4b5563 !important",
      "font-family:system-ui,-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif !important",
      "font-size:13px !important",
      "font-weight:400 !important",
      "line-height:1.5 !important",
      "text-align:left !important",
    ].join(";")
  );

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.textContent = "Open app to sign in";
  anchor.setAttribute(
    "style",
    [
      "all:revert",
      "display:flex !important",
      "align-items:center !important",
      "justify-content:center !important",
      "box-sizing:border-box !important",
      "width:100% !important",
      "min-block-size:44px !important",
      "margin:0 !important",
      "padding:10px 16px !important",
      "background:rgb(42, 71, 157) !important",
      "color:#ffffff !important",
      "border:1px solid transparent !important",
      "border-radius:8px !important",
      "text-decoration:none !important",
      "text-align:center !important",
      "font-family:system-ui,-apple-system,BlinkMacSystemFont,'Helvetica Neue',sans-serif !important",
      "font-size:16px !important",
      "font-weight:600 !important",
      "line-height:1.2 !important",
      "letter-spacing:normal !important",
      "text-transform:none !important",
    ].join(";")
  );
  anchor.addEventListener("click", () => {
    setTimeout(() => scrim.remove(), 300);
  });

  card.appendChild(closeButton);
  card.appendChild(title);
  card.appendChild(description);
  card.appendChild(anchor);
  scrim.appendChild(card);
  document.body.appendChild(scrim);
}

class App {
  #uid = 1;
  #sourceLanguage = undefined;
  #targetLanguage = undefined;
  #originalTexts = {};
  #translatedTexts = {};
  #visibleElements = {};

  #toastProgress = undefined;
  #toastError = undefined;

  #isProcessing = false;
  #shouldProcessAfterScrolling = false;
  #isShowingOriginal = false;

  constructor() {
    this.#init();
  }

  #init() {
    const link = document.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", browser.runtime.getURL("assets/nord.min.css"));
    document.head.appendChild(link);

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
    this.#observeTextSelection();
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
    document.body.insertAdjacentHTML("beforeend", `<div id="${id}"></div>`);
    document.getElementById(id).style.display = "none";
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
          case "responseTranslate": {
            const handleError = (error) => {
              const message =
                error || browser.i18n.getMessage("error_message_generic_error");
              this.#abortTranslation(message);
            };

            const response = request;
            if (!response || !response.result) {
              handleError();
              return;
            }

            const result = response.result.result;
            if (result && result.texts) {
              this.#sourceLanguage = result.lang;
              this.#targetLanguage = request.targetLanguage;

              const translatedTexts = result.texts;

              const visibleElements = this.#visibleElements[response.key];
              this.#visibleElements[response.key] = undefined;

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
                  ? browser.i18n.getMessage(
                      "error_message_quota_has_been_reached"
                    )
                  : response.result.error.message;
              handleError(message);
              return;
            } else {
              handleError();
              return;
            }

            this.#finishTranslation();
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
        // Tooltip を選択範囲の「上」に出す(iOS の標準 Copy/Paste メニューは
        // 選択範囲の上下どちらかに出るため、重なりを避けるために上側に寄せる)。
        // tooltip 高 40px + 矢印 8px + 余白 ≈ 56px を選択範囲の top より上に置く。
        // 画面上端に近い場合はクランプしてビューポート内に留める。
        const tooltipOffset = 56;
        const aboveY = selectionRect.top + window.scrollY - tooltipOffset;
        const minY = window.scrollY + 8;
        const y = Math.max(aboveY, minY);

        {
          const selection = window.getSelection();
          if (!selection || !selection.toString().trim()) {
            this.#removeTooltip();
            return;
          }
        }

        browser.storage.local.get(["settingsShowsIconForReading"], (result) => {
          const showsIconForReading =
            (result.settingsShowsIconForReading === undefined &&
              isTouchDevice()) ||
            result.settingsShowsIconForReading;
          if (showsIconForReading) {
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
          }
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

    const key = Math.random().toString(36).substr(2, 9);
    this.#visibleElements[key] = visibleElements;

    const texts = visibleElements.map((element) => element.text);
    await browser.runtime.sendMessage({
      method: "translate",
      texts,
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      key,
    });
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
    if (element.nodeName === "NOSCRIPT" || element.nodeName === "svg") {
      continue;
    }

    const children = element.children;
    const childNodes = Array.from(element.childNodes).filter((node) => {
      if (node.nodeType === Node.COMMENT_NODE) {
        return false;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue && node.nodeValue.trim();
      }
      return true;
    });

    if (hasTextNode(element)) {
      if (childNodes.length === 1 && children.length > 0) {
        splitElements(children, storage);
      } else {
        storage.push(element);
      }
      continue;
    }
    if (hasNoBlockElement(element)) {
      if (childNodes.length === 1 && children.length > 0) {
        splitElements(children, storage);
      } else {
        storage.push(element);
      }
      continue;
    }

    if (children.length === 0) {
      continue;
    }
    splitElements(children, storage);
  }
}

new App();
