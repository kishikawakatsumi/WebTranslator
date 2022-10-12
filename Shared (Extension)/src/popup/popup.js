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
  _translateView;
  _loginView;
  _translateSelectionButton;

  _isMobile = false;

  constructor() {
    this._init();
  }

  async run() {
    this._warnIfExtensionUnavailable();

    const response = await this._getContentState();
    if (response && response.result) {
      // Transration is already in progress or finished
      this._updateViewState(ViewState.TranslateView);

      if (response.result.isProcessing) {
        this._translateView.setLoading(true);
      } else if (response.result.isShowingOriginal) {
        this._translateView.showInitialView();
      } else {
        this._translateView.showResultView(
          response.result.sourceLanguage,
          response.result.targetLanguage
        );
      }
    } else {
      // No translation is in progress
      this._getUserDisplayName();
    }
  }

  _init() {
    if (window.screen.width < 768) {
      document.body.style.width = "100%";
    }
    browser.runtime.getPlatformInfo().then((info) => {
      if (info.os === "ios") {
        if (window.screen.width < 768) {
          this._isMobile = true;

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

    this._translateView = new TranslateView();
    this._translateView.on("change", this._onTranslateViewChange.bind(this));
    this._translateView.on("translate", this._onTranslate.bind(this));
    this._translateView.on("showOriginal", this._onShowOriginal.bind(this));
    browser.storage.local.get(["selectedTargetLanguage"], (result) => {
      this._translateView.setSelectedTargetLanguage(
        result.selectedTargetLanguage
      );
    });

    this._loginView = new LoginView();
    this._loginView.on("login", this._onLogin.bind(this));

    this._translateSelectionButton = new TranslateSelectionButton();
    this._translateSelectionButton.on(
      "click",
      this._onTranslateSelection.bind(this)
    );
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      browser.tabs
        .sendMessage(tabs[0].id, {
          method: "getSelection",
        })
        .then((response) => {
          this._setTranslateSelectionButtonEnabled(
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
          this._translateView.setLoading(true);
          sendResponse();
          break;
        case "cancelTranslation":
        case "finishTranslation":
          this._translateView.setLoading(false);
          this._translateView.showResultView(
            request.result.sourceLanguage,
            request.result.targetLanguage
          );
          sendResponse();
          break;
        case "finishTranslateSelection":
          this._translateSelectionButton.setLoading(false);
          sendResponse();
          break;
        default:
          sendResponse();
          break;
      }
    });
  }

  async _getContentState() {
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

  _login(email, password) {
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
                this._handleLoginError(LoginErorr.InvalidCredentials);
              } else {
                this._getUserDisplayName();
              }
            }
          );
        } else {
          this._handleLoginError(LoginErorr.ConnectionError);
        }
      }
    );
  }

  _getUserDisplayName() {
    this._loginView.setLoading(true);

    browser.runtime.sendNativeMessage(
      "application.id",
      { method: "getUserDisplayName" },
      (response) => {
        this._handleLoginSession(response);
        this._loginView.setLoading(false);
      }
    );
  }

  _handleLoginSession(response) {
    // No stored credentials
    if (!response || !response.result) {
      this._updateViewState(ViewState.LoginView);
      return;
    }

    // Session expired
    if (response.result.isPro === undefined) {
      if (response.result.credentials) {
        this._loginView.setCredentials(response.result.credentials);
      }
      this._handleLoginError(LoginErorr.SessionExpired);
      return;
    }

    if (response.result.isPro) {
      // Pro user
      this._updateViewState(ViewState.TranslateView);
    } else {
      // Free user
      if (response.result.credentials) {
        this._loginView.setCredentials(response.result.credentials);
      }
      this._handleLoginError(LoginErorr.NotPro);
      this._updateViewState(ViewState.LoginView);
    }
  }

  _handleLoginError(error) {
    switch (error) {
      case LoginErorr.ConnectionError:
        this._loginView.setErrorMessage(
          browser.i18n.getMessage("error_message_internet_connection")
        );
        break;
      case LoginErorr.InvalidCredentials:
        this._loginView.setErrorMessage(
          browser.i18n.getMessage("login_error_invalid_credentials_message")
        );
        break;
      case LoginErorr.SessionExpired:
        this._loginView.setErrorMessage(
          browser.i18n.getMessage("error_message_session_expired")
        );
        break;
      case LoginErorr.NotPro:
        this._loginView.setErrorMessage(
          browser.i18n.getMessage("login_error_not_pro_message")
        );
        break;
      default:
        this._loginView.setErrorMessage(
          browser.i18n.getMessage("login_error_default_message")
        );
        break;
    }
    this._loginView.setLoading(false);
  }

  _updateViewState(viewState) {
    switch (viewState) {
      case ViewState.LoginView:
        this._loginView.setHidden(false);
        this._translateView.setEnabled(false);
        if (this._isMobile) {
          this._translateView.setHidden(true);
        }
        break;
      case ViewState.TranslateView:
        this._loginView.setHidden(true);
        this._translateView.setEnabled(true);
        if (this._isMobile) {
          this._translateView.setHidden(false);
        }
        break;
    }
  }

  _onLogin(event) {
    this._loginView.setLoading(true);
    this._loginView.setErrorMessage(null);

    const email = event.detail.email;
    const password = event.detail.password;

    this._login(email, password);
  }

  _onTranslate(event) {
    this._translateView.setLoading(true);

    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      browser.tabs.sendMessage(tabs[0].id, {
        method: "translate",
        sourceLanguage: event.detail.sourceLanguage,
        targetLanguage: event.detail.targetLanguage,
      });
    });
  }

  _onShowOriginal() {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      browser.tabs.sendMessage(tabs[0].id, {
        method: "showOriginal",
      });
    });
    this._translateView.showInitialView();
  }

  async _onTranslateViewChange(event) {
    await browser.storage.local.set(event.detail);
  }

  _onTranslateSelection() {
    browser.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const response = await browser.tabs.sendMessage(tabs[0].id, {
        method: "getSelection",
      });
      if (response && response.result && response.result.trim()) {
        this._translateSelectionButton.setLoading(true);
        const request = {
          method: "translateSelection",
          selectionText: response.result,
        };
        browser.runtime.sendMessage(request);
      } else {
        this._setTranslateSelectionButtonEnabled(false);
      }
    });
  }

  _setTranslateSelectionButtonEnabled(enabled) {
    if (enabled) {
      this._translateSelectionButton.setEnabled(true);
    } else {
      this._translateSelectionButton.setEnabled(false);
      tippy(".tooltip-container", {
        content: browser.i18n.getMessage("translate_selection_button_tooltip"),
        animation: "fade",
      });
    }
  }

  _warnIfExtensionUnavailable() {
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
            this._translateView.setEnabled(false);
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
