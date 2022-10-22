"use strict";

function setup() {
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request) {
      return;
    }
    switch (request.method) {
      case "startTranslateSelection": {
        const selection = window.getSelection();
        const textRange = selection.getRangeAt(0);
        const selectionRect = textRange.getBoundingClientRect();

        const x = selectionRect.left + window.scrollX;
        const y = selectionRect.bottom + window.scrollY + 30;

        const position = getExistingPopoverPosition();
        const popover = createPopover(position || { x, y });
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
    }
  });
}

function createPopover(position) {
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

  const onClick = (event) => {
    if (event.target.closest(id)) {
      return;
    }
    popover.remove();
    document.removeEventListener("click", onClick);
  };

  document.addEventListener("click", onClick);
  popover.addEventListener("close", () => {
    popover.remove();
    document.removeEventListener("click", onClick);
  });
  popover.addEventListener("change", async (event) => {
    if (!event.detail) {
      return;
    }

    try {
      await browser.storage.local.set({
        selectedSourceLanguage: undefined,
        selectedTargetLanguage: event.detail.selectedTargetLanguage,
      });
    } catch (error) {
      popover.setAttribute("error", error.message);
    }
    browser.runtime.sendMessage({
      method: "translateSelection",
      selectionText: undefined,
    });
  });

  return popover;
}

function getExistingPopoverPosition() {
  const id = "translate-popover";
  const popover = document.getElementById(id);
  if (popover) {
    return popover.getPosition();
  }
  return undefined;
}

setup();
