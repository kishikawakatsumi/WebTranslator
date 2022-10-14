"use strict";

export function makeDraggable(element, dragzone) {
  let pos1 = 0;
  let pos2 = 0;
  let pos3 = 0;
  let pos4 = 0;

  const dragMouseDown = (event) => {
    event.preventDefault();

    pos3 = event.clientX || event.touches[0].clientX;
    pos4 = event.clientY || event.touches[0].clientY;

    document.addEventListener("pointermove", dragMouseMove);
    document.addEventListener("pointerup", dragMouseUp);
  };

  const dragMouseMove = (event) => {
    event.preventDefault();

    pos1 = pos3 - (event.clientX || event.touches[0].clientX);
    pos2 = pos4 - (event.clientY || event.touches[0].clientY);
    pos3 = event.clientX || event.touches[0].clientX;
    pos4 = event.clientY || event.touches[0].clientY;

    element.style.top = `${element.offsetTop - pos2}px`;
    element.style.left = `${element.offsetLeft - pos1}px`;
  };

  const dragMouseUp = () => {
    document.removeEventListener("pointermove", dragMouseMove);
    document.removeEventListener("pointerup", dragMouseUp);
  };

  dragzone.onmousedown = dragMouseDown;
  dragzone.ontouchstart = dragMouseDown;
}
