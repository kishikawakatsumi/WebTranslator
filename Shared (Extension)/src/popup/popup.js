"use strict";

import "./nord.css";
import "@nordhealth/components/lib/Banner";
import "@nordhealth/components/lib/Button";
import "@nordhealth/components/lib/Divider";
import "@nordhealth/components/lib/Input";
import "@nordhealth/components/lib/Select";
import "@nordhealth/components/lib/Stack";

import "./popup.css";

import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";

import { TranslateView } from "./translate_view";
import { LoginView } from "./login_view";
import { TranslateSelectionButton } from "./translate_selection_button";
import { runColorMode, loadColorScheme } from "../shared/utils";

class App {
  #translateView;
  #loginView;
  #translateSelectionButton;

  #isMobile = false;

  constructor() {
    this.#init();
  }

  async run() {
    this.#warnIfExtensionUnavailable();

    const response = await this.#getContentState();
    if (response && response.result) {
      // Transration is already in progress or finished
      this.#updateViewState(ViewState.TranslateView);

      if (response.result.isProcessing) {
        this.#translateView.setLoading(true);
      } else if (response.result.isShowingOriginal) {
        this.#translateView.showInitialView();
      } else {
        this.#translateView.showResultView(
          response.result.sourceLanguage,
          response.result.targetLanguage
        );
      }
    } else {
      // No translation is in progress
      this.#getUserDisplayName();
    }
  }

  #init() {
    if (window.screen.width < 768) {
      document.body.style.width = "100%";
    }
    browser.runtime.getPlatformInfo().then((info) => {
      if (info.os === "ios") {
        if (window.screen.width < 768) {
          this.#isMobile = true;

          document.getElementById("header-title").classList.add("d-hide");
          document.getElementById("login-view-divider").classList.add("d-hide");
          document.getElementById("translate-view").classList.add("d-hide");
        }
      } else {
        document
          .getElementById("translate-selection-button-container")
          .classList.add("d-hide");
      }
    });
    runColorMode((isDarkMode) => {
      loadColorScheme(
        isDarkMode ? "./assets/nord-dark.css" : "./assets/nord.css"
      );
    });

    this.#translateView = new TranslateView();
    this.#translateView.on("change", this.#onTranslateViewChange.bind(this));
    this.#translateView.on("translate", this.#onTranslate.bind(this));
    this.#translateView.on("showOriginal", this.#onShowOriginal.bind(this));
    browser.storage.local.get(["selectedTargetLanguage"], (result) => {
      this.#translateView.setSelectedTargetLanguage(
        result.selectedTargetLanguage
      );
    });

    this.#loginView = new LoginView();
    this.#loginView.on("login", this.#onLogin.bind(this));

    this.#translateSelectionButton = new TranslateSelectionButton();
    this.#translateSelectionButton.on(
      "click",
      this.#onTranslateSelection.bind(this)
    );
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      browser.tabs
        .sendMessage(tabs[0].id, {
          method: "getSelection",
        })
        .then((response) => {
          this.#setTranslateSelectionButtonEnabled(
            response && response.result && response.result.trim()
          );
        });
    });

    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (!request) {
        return;
      }
      switch (request.method) {
        case "startTranslation":
          this.#translateView.setLoading(true);
          sendResponse();
          break;
        case "cancelTranslation":
        case "finishTranslation":
          this.#translateView.setLoading(false);
          this.#translateView.showResultView(
            request.result.sourceLanguage,
            request.result.targetLanguage
          );
          sendResponse();
          break;
        case "finishTranslateSelection":
          this.#translateSelectionButton.setLoading(false);
          sendResponse();
          break;
        default:
          sendResponse();
          break;
      }
    });
  }

  async #getContentState() {
    return new Promise((resolve, reject) => {
      browser.tabs.query(
        { active: true, currentWindow: true },
        async (tabs) => {
          const response = await browser.tabs.sendMessage(tabs[0].id, {
            method: "getContentState",
          });
          resolve(response);
        }
      );
    });
  }

  #login(email, password) {
    browser.runtime.sendNativeMessage(
      "application.id",
      { method: "cf_clearance" },
      (response) => {
        if (response && response.result) {
          const cookies = response.result;

          const request = { method: "login", email, password, cookies };
          browser.runtime.sendNativeMessage(
            "application.id",
            request,
            (response) => {
              if (!response || !response.result) {
                this.#handleLoginError(LoginErorr.InvalidCredentials);
              } else {
                this.#getUserDisplayName();
              }
            }
          );
        } else {
          this.#handleLoginError(LoginErorr.ConnectionError);
        }
      }
    );
  }

  #getUserDisplayName() {
    this.#loginView.setLoading(true);

    browser.runtime.sendNativeMessage(
      "application.id",
      { method: "getUserDisplayName" },
      (response) => {
        this.#handleLoginSession(response);
        this.#loginView.setLoading(false);
      }
    );
  }

  #handleLoginSession(response) {
    // No stored credentials
    if (!response || !response.result) {
      this.#updateViewState(ViewState.LoginView);
      return;
    }

    // Session expired
    if (response.result.isPro === undefined) {
      if (response.result.credentials) {
        this.#loginView.setCredentials(response.result.credentials);
      }
      this.#handleLoginError(LoginErorr.SessionExpired);
      return;
    }

    if (response.result.isPro) {
      // Pro user
      this.#updateViewState(ViewState.TranslateView);
    } else {
      // Free user
      if (response.result.credentials) {
        this.#loginView.setCredentials(response.result.credentials);
      }
      this.#handleLoginError(LoginErorr.NotPro);
      this.#updateViewState(ViewState.LoginView);
    }
  }

  #handleLoginError(error) {
    switch (error) {
      case LoginErorr.ConnectionError:
        this.#loginView.setErrorMessage(
          browser.i18n.getMessage("error_message_internet_connection")
        );
        break;
      case LoginErorr.InvalidCredentials:
        this.#loginView.setErrorMessage(
          browser.i18n.getMessage("login_error_invalid_credentials_message")
        );
        break;
      case LoginErorr.SessionExpired:
        this.#loginView.setErrorMessage(
          browser.i18n.getMessage("error_message_session_expired")
        );
        break;
      case LoginErorr.NotPro:
        this.#loginView.setErrorMessage(
          browser.i18n.getMessage("login_error_not_pro_message")
        );
        break;
      default:
        this.#loginView.setErrorMessage(
          browser.i18n.getMessage("login_error_default_message")
        );
        break;
    }
    this.#loginView.setLoading(false);
  }

  #updateViewState(viewState) {
    switch (viewState) {
      case ViewState.LoginView:
        this.#loginView.setHidden(false);
        this.#translateView.setEnabled(false);
        if (this.#isMobile) {
          this.#translateView.setHidden(true);
        }
        break;
      case ViewState.TranslateView:
        this.#loginView.setHidden(true);
        this.#translateView.setEnabled(true);
        if (this.#isMobile) {
          this.#translateView.setHidden(false);
        }
        break;
    }
  }

  #onLogin(event) {
    this.#loginView.setLoading(true);
    this.#loginView.setErrorMessage(null);

    const email = event.detail.email;
    const password = event.detail.password;

    this.#login(email, password);
  }

  #onTranslate(event) {
    this.#translateView.setLoading(true);

    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      browser.tabs.sendMessage(tabs[0].id, {
        method: "translate",
        sourceLanguage: event.detail.sourceLanguage,
        targetLanguage: event.detail.targetLanguage,
      });
    });
  }

  #onShowOriginal() {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      browser.tabs.sendMessage(tabs[0].id, {
        method: "showOriginal",
      });
    });
    this.#translateView.showInitialView();
  }

  async #onTranslateViewChange(event) {
    await browser.storage.local.set(event.detail);
  }

  #onTranslateSelection() {
    browser.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const response = await browser.tabs.sendMessage(tabs[0].id, {
        method: "getSelection",
      });
      if (response && response.result && response.result.trim()) {
        this.#translateSelectionButton.setLoading(true);
        const request = {
          method: "translateSelection",
          selectionText: response.result,
        };
        browser.runtime.sendMessage(request);
      } else {
        this.#setTranslateSelectionButtonEnabled(false);
      }
    });
  }

  #setTranslateSelectionButtonEnabled(enabled) {
    if (enabled) {
      this.#translateSelectionButton.setEnabled(true);
    } else {
      this.#translateSelectionButton.setEnabled(false);
      tippy(".tooltip-container", {
        content: browser.i18n.getMessage("translate_selection_button_tooltip"),
        animation: "fade",
      });
    }
  }

  #warnIfExtensionUnavailable() {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      browser.tabs
        .sendMessage(tabs[0].id, {
          method: "ping",
        })
        .then((response) => {
          if (!response) {
            const message = browser.i18n.getMessage(
              "error_message_needs_reload"
            );
            const banner = document.getElementById("reload-message-banner");
            banner.textContent = message;
            banner.classList.remove("d-hide");
            this.#translateView.setEnabled(false);
          }
        });
    });
  }
}

const ViewState = {
  LoginView,
  TranslateView,
};

const LoginErorr = {
  ConnectionError: "ConnectionError",
  InvalidCredentials: "InvalidCredentials",
  SessionExpired: "SessionExpired",
  NotPro: "NotPro",
};

const app = new App();
app.run();
