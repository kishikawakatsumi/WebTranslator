"use strict";

export function makeDraggable(element, dragzone) {
  let pos1 = 0;
  let pos2 = 0;
  let pos3 = 0;
  let pos4 = 0;

  const isInside = (point, rect) =>
    point.x > rect.left &&
    point.x < rect.right &&
    point.y > rect.top &&
    point.y < rect.bottom;

  const dragMouseDown = (event) => {
    event.preventDefault();
    if (
      !isInside(
        {
          x: event.clientX || event.touches[0].clientX,
          y: event.clientY || event.touches[0].clientY,
        },
        dragzone.getBoundingClientRect()
      )
    ) {
      return;
    }

    pos3 = event.clientX || event.touches[0].clientX;
    pos4 = event.clientY || event.touches[0].clientY;

    document.onmousemove = dragMouseMove;
    document.onmouseup = dragMouseUp;

    document.ontouchmove = dragMouseMove;
    document.ontouchend = dragMouseUp;
  };

  const dragMouseMove = (event) => {
    event.preventDefault();
    if (
      !isInside(
        {
          x: event.clientX || event.touches[0].clientX,
          y: event.clientY || event.touches[0].clientY,
        },
        dragzone.getBoundingClientRect()
      )
    ) {
      return;
    }

    pos1 = pos3 - (event.clientX || event.touches[0].clientX);
    pos2 = pos4 - (event.clientY || event.touches[0].clientY);
    pos3 = event.clientX || event.touches[0].clientX;
    pos4 = event.clientY || event.touches[0].clientY;

    element.style.top = `${element.offsetTop - pos2}px`;
    element.style.left = `${element.offsetLeft - pos1}px`;
  };

  const dragMouseUp = () => {
    document.onmouseup = null;
    document.onmousemove = null;

    element.classList.remove("drag");
  };

  dragzone.onmousedown = dragMouseDown;
  dragzone.ontouchstart = dragMouseDown;
}
