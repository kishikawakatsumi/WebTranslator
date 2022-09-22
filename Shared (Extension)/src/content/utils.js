"use strict";

export function isVisible(element) {
  return new Promise((resolve) => {
    const o = new IntersectionObserver(([entry]) => {
      resolve(entry.intersectionRatio === 1);
      o.disconnect();
    });
    o.observe(element);
  });
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
    false
  );
}
