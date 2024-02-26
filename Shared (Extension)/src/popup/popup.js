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
  #dropdownSettings;
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
        this.#getUserDisplayName();
      }
    } else {
      this.#handleLoginSession(undefined);
    }

    workaroundForSafari14();
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
        isDarkMode
          ? browser.runtime.getURL("assets/nord-dark.css")
          : browser.runtime.getURL("assets/nord.css")
      );
    });

    this.#settingsMenu = document.getElementById("settings-menu");
    this.#userDisplayName = document.getElementById("user-display-name");

    this.#dropdownSettings = document.getElementById("dropdown-settings");
    this.#dropdownSettings.addEventListener("click", (event) => {
      event.preventDefault();
      browser.runtime.openOptionsPage();
    });

    document.getElementById("dropdown-settings-text").textContent =
      browser.i18n.getMessage("menu_settings_label");
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
      if (result && result.selectedTargetLanguage) {
        this.#translateView.setSelectedTargetLanguage(
          result.selectedTargetLanguage
        );
      }
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
    return await browser.runtime.sendNativeMessage("application.id", {
      method: "getLoginSession",
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

  async #logout() {
    await browser.runtime.sendNativeMessage("application.id", {
      method: "logout",
    });

    this.#translateView.showInitialView();

    this.#handleLoginSession(undefined);
    this.#loginView.setCredentials(undefined);
  }

  #getUserDisplayName() {
    this.#loginView.setLoading(true);

    browser.runtime.sendNativeMessage(
      "application.id",
      { method: "getUserDisplayName" },
      (response) => {
        this.#loginSpinner.classList.add("d-hide");
        this.#translateSelectionDivider.classList.remove("d-hide");
        this.#loginView.setHidden(false);

        this.#handleLoginSession(response);
        this.#loginView.setLoading(false);
      }
    );
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
    if (!response.result.isLoggedIn) {
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
          browser.i18n.getMessage(
            "warning_message_different_subscription_needed"
          )
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
}

function workaroundForSafari14() {
  // Workaround: fix popout glitch in Safari 14.x
  const settingsMenu = document.querySelector("#settings-menu");
  if (settingsMenu) {
    const dropdown = settingsMenu.shadowRoot.querySelector(".n-dropdown");
    if (dropdown) {
      const dropdownContent = dropdown.querySelector(".n-dropdown-content");
      if (dropdownContent) {
        const style = dropdownContent.style;
        if (style) {
          style.maxBlockSize = "initial";
        }
      }
    }
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
