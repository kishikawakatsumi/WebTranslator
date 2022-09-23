"use strict";

import "spectre.css/dist/spectre.min.css";
import "./popup.css";

import { TranslateView } from "./translate_view";
import { LoginView } from "./login_view";

const app = new App();
app.run();

class App {
  #loginView;
  #translateView;

  constructor() {
    this.#init();
  }

  async run() {
    const response = await this.#getContentState();
    if (response && response.result) {
      this.#toggleView(ViewState.TranslateView);

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
      this.#getLoginSession();
    }
  }

  #init() {
    if (window.screen.width < 768) {
      document.body.style.width = "100%";
    }
    browser.runtime.getPlatformInfo().then((info) => {
      if (info.os === "ios" && window.screen.width < 768) {
        document.getElementById("header-title").classList.add("d-hide");
      }
    });

    this.#loginView = new LoginView();
    this.#loginView.on("login", this.#onLogin.bind(this));

    this.#translateView = new TranslateView();
    this.#translateView.on("change", this.#onTranslateViewChange.bind(this));
    this.#translateView.on("translate", this.#onTranslate.bind(this));
    this.#translateView.on("showOriginal", this.#onShowOriginal.bind(this));
    browser.storage.local.get(["selectedTargetLanguage"], (result) => {
      this.#translateView.setSelectedTargetLanguage(
        result.selectedTargetLanguage
      );
    });

    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request && request.method === "startTranslation") {
        this.#translateView.setLoading(true);
        sendResponse();
      } else if (request && request.method === "finishTranslation") {
        this.#translateView.setLoading(false);
        this.#translateView.showResultView(
          request.result.sourceLanguage,
          request.result.targetLanguage
        );
        sendResponse();
      } else {
        sendResponse();
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
    const request = { method: "cf_clearance" };
    browser.runtime.sendNativeMessage("application.id", request, (response) => {
      if (response && response.result) {
        const cookies = response.result;

        const request = { method: "login", email, password, cookies };
        browser.runtime.sendNativeMessage(
          "application.id",
          request,
          (response) => {
            this.#handleLoginResponse(response);
            this.#getUserDisplayName();
          }
        );
      } else {
        this.#handleLoginResponse(undefined);
        this.#loginView.setLoading(false);
      }
    });
  }

  #getLoginSession() {
    this.#loginView.setLoading(true);

    const request = { method: "getLoginSession" };
    browser.runtime.sendMessage(request, (response) => {
      if (response && response.result) {
        this.#handleLoginSession(response);
        this.#loginView.setLoading(false);
      } else {
        this.#getUserDisplayName();
      }
    });
  }

  #getUserDisplayName() {
    const request = { method: "getUserDisplayName" };
    browser.runtime.sendNativeMessage("application.id", request, (response) => {
      this.#handleLoginSession(response);
      this.#loginView.setLoading(false);
    });
  }

  #handleLoginSession(response) {
    // No stored credentials
    if (!response || !response.result) {
      this.#toggleView(ViewState.LoginView);
      return;
    }

    // Session expired
    if (response.result.isPro === undefined) {
      if (response.result.credentials) {
        this.#loginView.setCredentials(response.result.credentials);
      }
      this.#loginView.setErrorMessage(
        browser.i18n.getMessage("login_error_session_expired_message")
      );
      return;
    }

    if (response.result.isPro) {
      // Pro user
      this.#toggleView(ViewState.TranslateView);
    } else {
      // Free user
      if (response.result.credentials) {
        this.#loginView.setCredentials(response.result.credentials);
      }
      this.#loginView.setErrorMessage(
        browser.i18n.getMessage("login_error_not_pro_message")
      );
      this.#toggleView(ViewState.LoginView);
    }
  }

  #handleLoginResponse(response) {
    if (!response || !response.result) {
      const errorMessage = browser.i18n.getMessage(
        "login_error_default_message"
      );
      this.#loginView.setErrorMessage(errorMessage);
    }
  }

  #toggleView(viewState) {
    switch (viewState) {
      case ViewState.LoginView:
        this.#loginView.setHidden(false);
        this.#translateView.setHidden(true);
        break;
      case ViewState.TranslateView:
        this.#loginView.setHidden(true);
        this.#translateView.setHidden(false);
        break;
    }
  }

  #onLogin(event) {
    this.#loginView.setLoading(true);

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
    await chrome.storage.local.set(event.detail);
  }
}

const ViewState = {
  LoginView,
  TranslateView,
};
