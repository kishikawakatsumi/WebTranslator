"use strict";

export function isVisible(element) {
  const rect = element.getBoundingClientRect();
  return rect.top <= window.innerHeight && rect.left <= window.innerWidth;
}

export function isHidden(element) {
  return (
    getComputedStyle(element).display === "none" ||
    !element.textContent ||
    element.textContent.trim() === ""
  );
}

export function hasTextNode(element) {
  const childNodes = element.childNodes;
  if (childNodes.length === 0) {
    return false;
  }
  for (const child of childNodes) {
    if (
      child.nodeType === Node.TEXT_NODE &&
      child.nodeValue &&
      child.nodeValue.trim() !== ""
    ) {
      return true;
    }
  }
  return false;
}

export function hasNoBlockElement(element) {
  const children = element.children;
  if (!children || children.length === 0) {
    return false;
  }
  return Array.from(children).every((child) => {
    const display = getComputedStyle(child).display;
    return (
      child.textContent &&
      child.textContent.trim() !== "" &&
      child.tagName !== "BASE" &&
      child.tagName !== "LINK" &&
      child.tagName !== "NOSCRIPT" &&
      child.tagName !== "SCRIPT" &&
      child.tagName !== "STYLE" &&
      child.tagName !== "TEMPLATE" &&
      child.tagName !== "TITLE" &&
      child.tagName !== "AUDIO" &&
      child.tagName !== "CANVAS" &&
      child.tagName !== "IMG" &&
      child.tagName !== "MATH" &&
      child.tagName !== "OBJECT" &&
      child.tagName !== "PICTURE" &&
      child.tagName !== "SVG" &&
      child.tagName !== "VIDEO" &&
      display !== "block" &&
      display !== "flex" &&
      display !== "table-row" &&
      display !== "table-cell" &&
      display !== "none"
    );
  });
}

export function scrollDidStop(callback, refresh = 200) {
  let isScrolling;
  window.addEventListener(
    "scroll",
    function (event) {
      window.clearTimeout(isScrolling);
      isScrolling = setTimeout(callback, refresh);
    },
    {
      once: false,
      passive: true,
      capture: true,
    }
  );
}

export function once(fn, context) {
  let result;
  return function () {
    if (fn) {
      result = fn.apply(context || this, arguments);
      fn = undefined;
    }
    return result;
  };
}

export function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
