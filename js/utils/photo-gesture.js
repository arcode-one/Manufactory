function swipeDirection(dx, dy) {
  if (Math.abs(dx) < 36 || Math.abs(dx) <= Math.abs(dy) * 1.2) return 0;
  return dx < 0 ? 1 : -1;
}

export function bindPhotoGesture(element, { swipe, tap, mouseDrag = false }) {
  let start = null;
  let suppressClick = false;

  element.addEventListener('pointerdown', () => { suppressClick = false; });
  element.addEventListener('touchstart', (event) => {
    suppressClick = false;
    start = event.touches.length === 1 ? event.touches[0] : null;
  }, { passive: true });
  element.addEventListener('touchcancel', () => { start = null; }, { passive: true });
  element.addEventListener('touchend', (event) => {
    const origin = start;
    start = null;
    const end = event.changedTouches[0];
    if (!origin || event.touches.length || end?.identifier !== origin.identifier) return;
    const dx = end.clientX - origin.clientX;
    const dy = end.clientY - origin.clientY;
    if (tap && event.cancelable && Math.hypot(dx, dy) < 10) {
      event.preventDefault();
      tap();
      return;
    }
    const direction = swipeDirection(dx, dy);
    if (!swipe || !direction) return;
    suppressClick = true;
    swipe(direction);
  });

  if (mouseDrag && swipe) {
    let drag = null;
    element.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      element.setPointerCapture(event.pointerId);
    });
    element.addEventListener('pointermove', (event) => {
      if (drag?.id !== event.pointerId) return;
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) >= 10) {
        suppressClick = true;
      }
    });
    element.addEventListener('pointerup', (event) => {
      if (drag?.id !== event.pointerId) return;
      const direction = swipeDirection(event.clientX - drag.x, event.clientY - drag.y);
      drag = null;
      if (!direction) return;
      suppressClick = true;
      swipe(direction);
    });
    element.addEventListener('lostpointercapture', () => { drag = null; });
  }

  element.addEventListener('click', (event) => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}
