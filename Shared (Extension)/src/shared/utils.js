"use strict";

export function runColorMode(fn) {
  if (!window.matchMedia) {
    return;
  }

  const query = window.matchMedia("(prefers-color-scheme: dark)");
  fn(query.matches);
  query.addEventListener("change", (event) => fn(event.matches));
}

export function loadColorScheme(file) {
  const head = document.getElementsByTagName("head").item(0);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = file;
  head.appendChild(link);
}

export async function sendTabMessage(request) {
  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  return await browser.tabs.sendMessage(tabs[0].id, request);
}

export async function sendNativeMessage(request) {
  return await browser.runtime.sendNativeMessage("application.id", request);
}
