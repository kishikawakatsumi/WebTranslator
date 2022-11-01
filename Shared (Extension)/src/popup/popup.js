"use strict";

import "./nord.css";
import "@nordhealth/components/lib/Banner";
import "@nordhealth/components/lib/Button";
import "@nordhealth/components/lib/Divider";
import "@nordhealth/components/lib/Dropdown";
import "@nordhealth/components/lib/DropdownGroup";
import "@nordhealth/components/lib/DropdownItem";
import "@nordhealth/components/lib/Icon";
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
  #settingsMenu;
  #userDisplayName;
  #dropdownFeedback;
  #dropdownLogout;

  #translateView;
  #loginView;
  #loginSpinner;
  #translateSelectionDivider;
  #translateSelectionButton;

  #isMobile = false;

  constructor() {
    this.#init();
  }

  async run() {
    const response = await this.#getLoginSession();
    if (response && response.result) {
      const response = await this.#getContentState();
      if (response && response.result) {
        this.#dropdownLogout.classList.remove("disabled");

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
        this.#loginSpinner.classList.remove("d-hide");
        this.#translateSelectionDivider.classList.add("d-hide");
        this.#loginView.setHidden(true);
        await this.#getUserDisplayName();
      }
    } else {
      this.#handleLoginSession(undefined);
    }
  }

  #init() {
    const settingsButton = document.getElementById("settings-button");
    settingsButton.addEventListener("click", () => {
      requestAnimationFrame(() => {
        document.activeElement.blur();
      });
    });

    const placeSettingsButtonTop = () => {
      settingsButton.style.position = "absolute";
      settingsButton.style.top = "4px";
      settingsButton.style.right = "4px";
      settingsButton.setAttribute("variant", "plain");
    };
    const placeSettingsButtonBottom = () => {
      settingsButton.style.position = "static";
      settingsButton.style.top = "";
      settingsButton.style.right = "";
      settingsButton.setAttribute("variant", "default");

      const dropdownContent = document
        .getElementById("settings-menu")
        .shadowRoot.querySelector(".n-dropdown-content");
      if (dropdownContent) {
        dropdownContent.style.padding =
          "var(--n-space-s) 0 calc(var(--n-space-s) + 21px)";
      }
    };
    placeSettingsButtonTop();

    if (window.screen.width < 744) {
      document.body.style.width = "100%";
      placeSettingsButtonBottom();
    }
    browser.runtime.getPlatformInfo().then((info) => {
      if (info.os === "ios") {
        if (window.screen.width < 744) {
          this.#isMobile = true;

          document.getElementById("header-title").classList.add("d-hide");
          placeSettingsButtonBottom();
          document.getElementById("login-view-divider").classList.add("d-hide");
          document.getElementById("translate-view").classList.add("d-hide");
        }

        const applyAddaptiveAppearance = () => {
          if (
            window.screen.width < 744 ||
            (document.documentElement.clientWidth > 375 &&
              document.documentElement.clientWidth <= 639)
          ) {
            document.body.style.width = "100%";
            document.getElementById("header-title").classList.add("d-hide");
            placeSettingsButtonBottom();
          } else {
            document.body.style.width = "375px";

            requestAnimationFrame(() => {
              const documentHeight =
                document.documentElement.getBoundingClientRect().height;
              if (Math.ceil(documentHeight) !== window.innerHeight) {
                document.getElementById("header-title").classList.add("d-hide");
                placeSettingsButtonBottom();
              } else {
                document
                  .getElementById("header-title")
                  .classList.remove("d-hide");
                placeSettingsButtonTop();
              }
            });
          }
        };
        const resizeObserver = new ResizeObserver(() => {
          applyAddaptiveAppearance();
        });
        resizeObserver.observe(document.documentElement);
      } else {
        document
          .getElementById("translate-selection-button-container")
          .classList.add("d-collapse");
      }
    });
    runColorMode((isDarkMode) => {
      loadColorScheme(
        isDarkMode ? "./assets/nord-dark.css" : "./assets/nord.css"
      );
    });

    this.#settingsMenu = document.getElementById("settings-menu");
    this.#userDisplayName = document.getElementById("user-display-name");
    this.#dropdownFeedback = document.getElementById("dropdown-feedback");
    this.#dropdownFeedback.addEventListener("click", (event) => {
      event.preventDefault();
      browser.tabs.create({
        url: "https://forms.gle/rGdfU5Kr9QtzPWtv5",
      });
    });
    document.getElementById("dropdown-feedback-text").textContent =
      browser.i18n.getMessage("menu_feedback_label");
    this.#dropdownLogout = document.getElementById("dropdown-logout");
    this.#dropdownLogout.addEventListener("click", async (event) => {
      event.preventDefault();

      await this.#logout();
      this.#settingsMenu.hide(false);
    });
    document.getElementById("dropdown-logout-text").textContent =
      browser.i18n.getMessage("menu_logout_label");

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

    this.#loginSpinner = document.getElementById("login-spinner");
    this.#translateSelectionDivider = document.getElementById(
      "translate-selection-button-divider"
    );

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
        case "startTranslation": {
          this.#translateView.setLoading(true);

          const banner = document.getElementById("translation-error-banner");
          banner.classList.add("d-hide");

          sendResponse();
          break;
        }
        case "abortTranslation": {
          this.#translateView.setLoading(false);

          const message =
            request.message ||
            browser.i18n.getMessage("error_message_generic_error");
          const banner = document.getElementById("translation-error-banner");
          banner.textContent = message;
          banner.classList.remove("d-hide");

          sendResponse();
          break;
        }
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

  async #getLoginSession() {
    return await sendNativeMessage({
      method: "getLoginSession",
    });
  }

  async #getContentState() {
    return await sendMessage({
      method: "getContentState",
    });
  }

  async #login(email, password) {
    const response = await sendNativeMessage({ method: "cf_clearance" });

    if (response && response.result) {
      const cookies = response.result;

      const request = { method: "login", email, password, cookies };
      const response = await sendNativeMessage(request);

      if (!response || !response.result) {
        this.#handleLoginError(LoginErorr.InvalidCredentials);
      } else {
        await this.#getUserDisplayName();
      }
    } else {
      this.#handleLoginError(LoginErorr.ConnectionError);
    }
  }

  async #logout() {
    await browser.runtime.sendNativeMessage("application.id", {
      method: "logout",
    });

    this.#translateView.showInitialView();

    this.#handleLoginSession(undefined);
    this.#loginView.setCredentials(undefined);
  }

  async #getUserDisplayName() {
    this.#loginView.setLoading(true);

    const response = sendNativeMessage({ method: "getUserDisplayName" });

    this.#loginSpinner.classList.add("d-hide");
    this.#loginView.setHidden(false);

    this.#translateSelectionDivider.classList.remove("d-hide");

    this.#handleLoginSession(response);

    this.#loginView.setLoading(false);
  }

  #handleLoginSession(response) {
    this.#userDisplayName.setAttribute("heading", "");
    this.#dropdownLogout.classList.add("disabled");

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
      if (response.result.email) {
        this.#userDisplayName.setAttribute("heading", response.result.email);
        this.#dropdownLogout.classList.remove("disabled");
      }
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

  async #onLogin(event) {
    this.#loginView.setLoading(true);
    this.#loginView.setErrorMessage(null);

    const email = event.detail.email;
    const password = event.detail.password;

    await this.#login(email, password);
  }

  async #onTranslate(event) {
    this.#translateView.setLoading(true);
    await sendMessage({
      method: "translate",
      sourceLanguage: event.detail.sourceLanguage,
      targetLanguage: event.detail.targetLanguage,
    });
  }

  async #onShowOriginal() {
    await sendMessage({
      method: "showOriginal",
    });
    this.#translateView.showInitialView();
  }

  async #onTranslateViewChange(event) {
    await browser.storage.local.set(event.detail);
  }

  async #onTranslateSelection() {
    const response = await sendMessage({
      method: "getSelection",
    });
    if (response && response.result && response.result.trim()) {
      this.#translateSelectionButton.setLoading(true);
      const request = {
        method: "translateSelection",
        selectionText: response.result,
      };
      await browser.runtime.sendMessage(request);
    } else {
      this.#setTranslateSelectionButtonEnabled(false);
    }
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
}

async function sendMessage(request) {
  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  return await browser.tabs.sendMessage(tabs[0].id, request);
}

async function sendNativeMessage(request) {
  return await browser.runtime.sendNativeMessage("application.id", request);
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
