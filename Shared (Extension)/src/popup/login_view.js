"use strict";

export class LoginView extends EventTarget {
  #loginView;
  #loginLabel;

  #emailInput;
  #passwordInput;

  #errorLabel;
  #loginButton;

  constructor() {
    super();
    this.#init();
  }

  setCredentials(credentials) {
    this.#emailInput.value = credentials.email;
    this.#passwordInput.value = credentials.password;
  }

  setHidden(hidden) {
    this.#loginView.classList.toggle("d-hide", hidden);
  }

  setLoading(loading) {
    if (loading) {
      this.#emailInput.disabled = true;
      this.#passwordInput.disabled = true;

      this.#loginButton.disabled = true;
      this.#loginButton.classList.add("loading");
    } else {
      this.#emailInput.disabled = false;
      this.#passwordInput.disabled = false;

      this.#loginButton.disabled = false;
      this.#loginButton.classList.remove("loading");
    }
  }

  setErrorMessage(message) {
    if (message) {
      this.#errorLabel.textContent = message;
      this.#errorLabel.classList.remove("d-invisible");
    } else {
      this.#errorLabel.classList.add("d-invisible");
    }
  }

  on(type, listener) {
    this.addEventListener(type, listener);
  }

  #init() {
    this.#loginView = document.getElementById("login-view");

    this.#loginLabel = document.getElementById("login-label");
    this.#loginLabel.textContent = browser.i18n.getMessage("ui_login_body");

    this.#emailInput = document.getElementById("email-input");
    this.#passwordInput = document.getElementById("password-input");

    this.#errorLabel = document.getElementById("login-error-label");

    this.#loginButton = document.getElementById("login-button");
    this.#loginButton.textContent =
      browser.i18n.getMessage("login_button_label");
    this.#loginButton.disabled = true;

    this.#loginButton.addEventListener("click", (event) => {
      this.#onLoginButtonClick(event);
    });
  }

  #onLoginButtonClick() {
    const email = this.#emailInput.value;
    const password = this.#passwordInput.value;

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
