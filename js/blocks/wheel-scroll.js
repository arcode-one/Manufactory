// Three wheel increments travel the distance of one native increment.
export function initWheelScroll() {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let target = window.scrollY;
  let previousTime = 0;
  const cancel = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    target = window.scrollY;
  };
  const maximum = () => Math.max(0, document.documentElement.scrollHeight - innerHeight);
  const clamp = value => Math.max(0, Math.min(maximum(), value));
  function draw(now) {
    const elapsed = Math.min(64, now - previousTime);
    previousTime = now;
    target = clamp(target);
    const distance = target - window.scrollY;
    // Browsers round scroll positions. Always advance at least one CSS pixel,
    // otherwise easing can stall above zero, especially on high-refresh screens.
    const step = Math.min(Math.abs(distance), Math.max(1, Math.abs(distance) * (1 - Math.exp(-elapsed / 65))));
    const next = Math.abs(distance) <= 1 ? target : window.scrollY + Math.sign(distance) * step;
    window.scrollTo({ top: next, behavior: 'instant' });
    if (Math.abs(target - window.scrollY) > 1) frame = requestAnimationFrame(draw);
    else {
      window.scrollTo({ top: target, behavior: 'instant' });
      frame = 0;
    }
  }
  window.addEventListener('wheel', event => {
    if (!event.cancelable || event.ctrlKey || event.metaKey || event.shiftKey ||
        !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const element = event.target instanceof Element ? event.target : null;
    if (document.querySelector('dialog[open], [data-menu-toggle][aria-expanded="true"]') ||
        element?.closest('input, textarea, select, [contenteditable="true"], [data-scroll-native]')) {
      cancel(); return;
    }
    // Lists and dialogs keep their own native scroll behaviour.
    for (let node = element; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
      if (node.scrollHeight > node.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(node).overflowY)) {
        cancel(); return;
      }
    }
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    if (!frame || Math.sign(target - window.scrollY) !== Math.sign(event.deltaY)) target = window.scrollY;
    target = clamp(target + event.deltaY * unit / 3);
    if (reducedMotion.matches) {
      window.scrollTo({ top: target, behavior: 'instant' });
    } else if (!frame) {
      previousTime = performance.now();
      frame = requestAnimationFrame(draw);
    }
  }, { passive: false });
  ['pointerdown', 'touchstart', 'keydown', 'resize'].forEach(type => window.addEventListener(type, cancel, { passive: true }));
  document.addEventListener('visibilitychange', cancel);
  reducedMotion.addEventListener('change', cancel);
}
