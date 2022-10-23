"use strict";

import "./nord.css";
import "@nordhealth/components/lib/Icon";

const template = `<style>
  * {
    -webkit-tap-highlight-color: transparent;
  }
  html {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  .container {
    width: 40px;
    height: 40px;
    position: absolute;
    border-radius: 5px;
    filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.16));
    transform: translateZ(0);
    z-index: 9997;
  }
  .container:after {
    position: absolute;
    top: -7.5px;
    left: 50%;
    margin-left: -8px;
    content:'';
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-bottom: 8px solid #fff;
  }

  @media (prefers-color-scheme: light) {
    .container {
      background: #fff;
    }
  }
  @media (prefers-color-scheme: dark) {
    .container {
      background: rgb(24, 27, 32);
    }
  }

  .icon {
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    position: absolute;
  }

  .d-none,
  .d-hide {
    display: none !important;
  }
</style>

<div class="container">
  <nord-icon size="l" class="icon">
    <svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g fill="#0F2B46">
          <path d="M38,1.15470054 L65.1769145,16.8452995 C66.4145188,17.5598306 67.1769145,18.8803387 67.1769145,20.3094011 L67.1769145,51.6905989 C67.1769145,53.1196613 66.4145188,54.4401694 65.1769145,55.1547005 L38,70.8452995 C36.7623957,71.5598306 35.2376043,71.5598306 34,70.8452995 L6.82308546,55.1547005 C5.58548116,54.4401694 4.82308546,53.1196613 4.82308546,51.6905989 L4.82308546,20.3094011 C4.82308546,18.8803387 5.58548116,17.5598306 6.82308546,16.8452995 L34,1.15470054 C35.2376043,0.440169359 36.7623957,0.440169359 38,1.15470054 Z M54.0726781,18.4659961 C53.5740668,17.4803691 52.3708539,17.0855649 51.3852269,17.5841762 L29.2359139,28.7891228 C29.0469082,28.8847374 28.8742912,29.0097694 28.7245159,29.1595448 C28.6921476,29.1919131 28.6611206,29.2251149 28.6322214,29.258928 C28.4393219,29.4249298 28.2751042,29.6307497 28.1530838,29.8719528 L16.9481372,52.0212659 C16.6609846,52.5888932 16.6609846,53.2592698 16.9481372,53.8268971 C17.4467485,54.8125241 18.6499614,55.2073283 19.6355884,54.708717 L41.7849014,43.5037704 C41.9739071,43.4081558 42.1465241,43.2831238 42.2962994,43.1333485 C42.3289914,43.1006564 42.3603151,43.0671142 42.3895728,43.0331222 C42.582049,42.8672668 42.7459175,42.6617354 42.8677315,42.4209404 L54.0726781,20.2716273 C54.3598307,19.704 54.3598307,19.0336234 54.0726781,18.4659961 Z"></path>
        </g>
        <circle fill="#0F2B46" cx="36" cy="36" r="5"></circle>
      </g>
    </svg>
  </nord-icon>
</div>`;

export class Tooltip extends HTMLElement {
  #container;
  #rendered = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  #render() {
    const tooltip = document.createElement("div");
    tooltip.innerHTML = template;
    this.shadow.append(tooltip);

    this.#container = this.shadowRoot.querySelector(".container");
    this.#container.addEventListener("touchend", this.#onClick.bind(this));
    this.#container.addEventListener("pointerup", this.#onClick.bind(this));

    this.#fadeIn(this.#container);
  }

  connectedCallback() {
    if (!this.#rendered) {
      this.#render();
      this.#rendered = true;
    }
  }

  static get observedAttributes() {
    return ["position"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case "position":
        const { x, y } = JSON.parse(newValue);
        this.#setPosition(x, y);
        break;
    }
  }

  #setPosition(x, y) {
    this.#container.style.top = `${y}px`;
    this.#container.style.left = `${x}px`;
  }

  #onClick(event) {
    event.preventDefault();
    event.stopPropagation();
    this.dispatchEvent(new CustomEvent("tooltipClick"));
    return false;
  }

  #fadeIn(element) {
    element.animate(
      [
        { opacity: 0, transform: "scale(0.8)" },
        { opacity: 1, transform: "scale(1)" },
      ],
      {
        duration: 250,
        easing: "ease-in",
      }
    );
  }
}
