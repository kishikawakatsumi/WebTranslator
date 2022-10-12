"use strict";

export class LoginView extends EventTarget {
  _loginView;
  _loginLabel;

  _emailInput;
  _passwordInput;

  _errorLabel;
  _loginButton;

  constructor() {
    super();
    this._init();
  }

  setCredentials(credentials) {
    this._emailInput.value = credentials.email;
    this._passwordInput.value = credentials.password;
  }

  setHidden(hidden) {
    this._loginView.classList.toggle("d-hide", hidden);
  }

  setLoading(loading) {
    this._emailInput.disabled = loading;
    this._passwordInput.disabled = loading;
    if (loading) {
      this._loginButton.setAttribute("loading", loading);
    } else {
      this._loginButton.removeAttribute("loading");
    }
  }

  setErrorMessage(message) {
    if (message) {
      this._errorLabel.textContent = message;
      this._errorLabel.classList.remove("d-invisible");
    } else {
      this._errorLabel.classList.add("d-invisible");
    }
  }

  on(type, listener) {
    this.addEventListener(type, listener);
  }

  _init() {
    this._loginView = document.getElementById("login-view");

    this._loginLabel = document.getElementById("login-label");
    this._loginLabel.textContent = browser.i18n.getMessage("ui_login_body");

    this._emailInput = document.getElementById("email-input");
    this._emailInput.label = browser.i18n.getMessage("ui_email_input_label");
    this._passwordInput = document.getElementById("password-input");
    this._passwordInput.label = browser.i18n.getMessage(
      "ui_password_input_label"
    );
    this._errorLabel = document.getElementById("login-error-label");

    this._loginButton = document.getElementById("login-button");
    this._loginButton.textContent =
      browser.i18n.getMessage("login_button_label");

    this._loginButton.addEventListener("click", (event) => {
      this._onLoginButtonClick(event);
    });
  }

  _onLoginButtonClick() {
    const email = this._emailInput.value;
    const password = this._passwordInput.value;

    if (!email || !password) {
      const errorMessage = browser.i18n.getMessage(
        "login_error_validation_error_message"
      );
      this.setErrorMessage(errorMessage);
      return;
    }

    this.dispatchEvent(
      new CustomEvent("login", { detail: { email, password } })
    );
  }
}
