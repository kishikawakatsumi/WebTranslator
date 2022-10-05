"use strict";

export function isVisible(element) {
  const rect = element.getBoundingClientRect();
  return rect.top <= window.innerHeight && rect.left <= window.innerWidth;
}

export function hasTextNode(element) {
  const childNodes = element.childNodes;
  if (childNodes.length === 0) {
    return false;
  }
  return (
    childNodes[0].nodeType === Node.TEXT_NODE &&
    childNodes[0].nodeValue.trim() !== ""
  );
}

export function hasInlineElement(element) {
  const children = element.children;
  if (!children || children.length === 0) {
    return false;
  }
  for (const child of children) {
    const display = getComputedStyle(child).display;
    if (display === "inline" || display === "inline-block") {
      return true;
    }
  }
}

export function scrollStop(callback, refresh = 200) {
  if (!callback || typeof callback !== "function") {
    return;
  }

  let isScrolling;
  window.addEventListener(
    "scroll",
    function (event) {
      window.clearTimeout(isScrolling);
      isScrolling = setTimeout(callback, refresh);
    },
    true
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

export function debounce(cb, delay = 250) {
  let timeout;

  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      cb(...args);
    }, delay);
  };
}

export function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
