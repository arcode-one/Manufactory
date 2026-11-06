// Один жест переключает один экран. Страница остаётся обычным документом.
const instances = new WeakSet();
const EDGE = 3;
const GESTURE_PAUSE = 150;

function bezier(progress) {
  // cubic-bezier(0.77, 0, 0.175, 1): ускорение и мягкая остановка.
  if (progress <= 0 || progress >= 1) return progress;
  const coordinate = (t, a, b) =>
    3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 16; i++) {
    const middle = (low + high) / 2;
    if (coordinate(middle, 0.77, 0.175) < progress) low = middle;
    else high = middle;
  }
  return coordinate((low + high) / 2, 0, 1);
}

export function initSectionScroll(root) {
  if (instances.has(root)) return;
  const sections = [...document.querySelectorAll('[data-scroll-screen] > section, [data-scroll-screen] > footer')];
  if (sections.length < 2) return;
  instances.add(root);
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 1280px)');
  const enabled = () => desktop.matches && !preference.matches;
  const header = document.querySelector('[data-header]');
  let frame = 0;
  let moving = false;
  let direction = 0;
  let lastWheel = -Infinity;
  let wheelTotal = 0;
  let touch = null;
  let activeSection = null;

  function blocked() {
    return !enabled() || document.hidden ||
      Boolean(document.querySelector('dialog[open], [data-menu-toggle][aria-expanded="true"]'));
  }

  function cancel() {
    cancelAnimationFrame(frame);
    frame = 0;
    moving = false;
    root.classList.remove('page--section-scrolling');
  }

  function geometry() {
    const offset = header?.getBoundingClientRect().height || 0;
    const maximum = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const clamp = (value) => Math.max(0, Math.min(maximum, value));
    return {
      sections: sections.filter((element) => element.getClientRects().length).map((element, index) => {
        const screen = element.parentElement;
        const rect = screen.getBoundingClientRect();
        const start = clamp(rect.top + scrollY - (index || root.hasAttribute('data-scroll-header') ? offset : 0));
        return { element, screen, start };
      }),
    };
  }

  function destination(delta) {
    const layout = geometry();
    const y = scrollY;
    let index = 0;
    layout.sections.forEach((section, i) => {
      if (section.start <= y + EDGE) index = i;
    });
    const current = layout.sections[index];
    if (delta > 0) {
      const next = layout.sections[index + 1];
      if (next) next.screen.scrollTop = 0;
      return next?.start ?? current.start;
    }
    if (y > current.start + EDGE) return current.start;
    const previous = layout.sections[index - 1];
    if (previous) previous.screen.scrollTop = 0;
    return previous?.start ?? 0;
  }

  function goTo(target, instantly = false) {
    cancel();
    activeSection = geometry().sections.find((section) => Math.abs(section.start - target) < 1)?.element || activeSection;
    const start = scrollY;
    const distance = target - start;
    if (Math.abs(distance) < 1) return;
    if (instantly || preference.matches) {
      window.scrollTo({ top: target, behavior: 'instant' });
      return;
    }
    const duration = parseFloat(getComputedStyle(root).getPropertyValue('--section-scroll-duration')) || 900;
    const started = performance.now();
    moving = true;
    direction = Math.sign(distance);
    root.classList.add('page--section-scrolling');
    function draw(now) {
      if (blocked()) return cancel();
      const progress = Math.min(1, (now - started) / duration);
      window.scrollTo({ top: start + distance * bezier(progress), behavior: 'instant' });
      if (progress < 1) frame = requestAnimationFrame(draw);
      else cancel();
    }
    frame = requestAnimationFrame(draw);
  }

  function nestedScroll(target, delta) {
    if (!(target instanceof Element)) return true;
    if (target.closest('input, textarea, select, [contenteditable="true"], [data-scroll-native]')) return true;
    for (let element = target; element && element !== document.body; element = element.parentElement) {
      if (element.scrollHeight <= element.clientHeight + 1) continue;
      if (!/(auto|scroll)/.test(getComputedStyle(element).overflowY)) continue;
      if (delta < 0 ? element.scrollTop > 0 : element.scrollTop + element.clientHeight < element.scrollHeight - 1) return true;
    }
    return false;
  }

  window.addEventListener('wheel', (event) => {
    if (blocked() || event.ctrlKey || event.metaKey || event.shiftKey || !event.cancelable ||
      Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return;
    const now = performance.now();
    if (nestedScroll(event.target, event.deltaY)) {
      lastWheel = now;
      direction = Math.sign(event.deltaY);
      wheelTotal = 0;
      return;
    }
    const pause = now - lastWheel;
    const nextDirection = Math.sign(event.deltaY);
    const reversed = nextDirection !== direction;
    lastWheel = now;
    event.preventDefault();
    // Инерционный хвост тачпада не запускает следующий экран.
    if (moving && !reversed) return;
    if (!moving && pause < GESTURE_PAUSE && !reversed && !wheelTotal) return;
    if (pause >= GESTURE_PAUSE || reversed) wheelTotal = 0;
    direction = nextDirection;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    wheelTotal += event.deltaY * unit;
    if (Math.abs(wheelTotal) < 18) return;
    wheelTotal = 0;
    goTo(destination(nextDirection));
  }, { passive: false });

  window.addEventListener('touchstart', (event) => {
    touch = null;
    if (blocked() || event.touches.length !== 1) return;
    const point = event.touches[0];
    cancel();
    touch = { x: point.clientX, y: point.clientY, pageY: scrollY, native: false, handled: false };
  }, { passive: true });

  window.addEventListener('touchmove', (event) => {
    if (!touch || touch.native || blocked() || event.touches.length !== 1) return;
    const dx = touch.x - event.touches[0].clientX;
    const dy = touch.y - event.touches[0].clientY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 6) return;
    if (Math.abs(dx) > Math.abs(dy) || nestedScroll(event.target, dy)) {
      touch.native = true;
      return;
    }
    if (touch.handled) {
      if (event.cancelable) event.preventDefault();
      return;
    }
    if (!event.cancelable) return;
    event.preventDefault();
    if (Math.abs(dy) < 45) return;
    touch.handled = true;
    goTo(destination(Math.sign(dy)));
  }, { passive: false });
  window.addEventListener('touchend', () => { touch = null; }, { passive: true });
  window.addEventListener('touchcancel', () => { touch = null; cancel(); }, { passive: true });

  function anchorSection(hash) {
    const target = document.getElementById(hash.slice(1));
    const element = sections.find((section) => section === target || section.contains(target));
    return element ? { target, ...geometry().sections.find((item) => item.element === element) } : null;
  }

  function alignAnchor(anchor) {
    const { target, element, screen } = anchor;
    screen.scrollTop = target === element ? 0 : screen.scrollTop + target.getBoundingClientRect().top - screen.getBoundingClientRect().top - 16;
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !enabled()) return;
    const hash = link.getAttribute('href');
    const top = hash === '#' || hash === '#top';
    const anchor = top ? null : anchorSection(hash);
    if (!top && !anchor) return;
    event.preventDefault();
    if (anchor) alignAnchor(anchor);
    const position = top ? 0 : anchor.start;
    goTo(position, event.detail === 0);
    if (location.hash !== hash) history.pushState(null, '', hash);
  });

  window.addEventListener('keydown', (event) => {
    if (['Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
      cancel();
      wheelTotal = 0;
      lastWheel = -Infinity;
    }
  }, true);
  window.addEventListener('pointerdown', cancel, { passive: true });
  window.addEventListener('scroll', () => {
    if (moving || !enabled()) return;
    activeSection = geometry().sections.reduce((nearest, section) =>
      !nearest || Math.abs(section.start - scrollY) < Math.abs(nearest.start - scrollY) ? section : nearest,
    null)?.element || activeSection;
  }, { passive: true });
  window.addEventListener('resize', () => {
    cancel();
    if (!enabled() || document.activeElement?.matches('input, textarea, select')) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const section = geometry().sections.find((item) => item.element === activeSection);
      if (section) window.scrollTo({ top: section.start, behavior: 'instant' });
    });
  }, { passive: true });
  function restoreHistory() {
    cancel();
    if (!enabled()) return;
    const anchor = anchorSection(location.hash);
    if (anchor) {
      alignAnchor(anchor);
      goTo(anchor.start, true);
    } else if (!location.hash || location.hash === '#' || location.hash === '#top') goTo(0, true);
  }
  window.addEventListener('hashchange', restoreHistory);
  window.addEventListener('popstate', restoreHistory);
  document.addEventListener('visibilitychange', cancel);
  function syncMode() {
    cancel();
    touch = null;
    wheelTotal = 0;
    lastWheel = -Infinity;
    root.classList.toggle('page--section-scroll', enabled());
    history.scrollRestoration = enabled() ? 'manual' : 'auto';
  }
  preference.addEventListener('change', syncMode);
  desktop.addEventListener('change', syncMode);
  syncMode();
  const startingSection = sections.find((section) => section.id === root.dataset.startSection) ||
    sections.find((section) => `#${section.id}` === location.hash) || sections[0];
  activeSection = startingSection;
  function restoreStart() {
    if (!enabled()) return;
    const section = geometry().sections.find((item) => item.element === startingSection);
    if (!section) return;
    section.screen.scrollTop = Number(root.dataset.startOffset) || 0;
    const anchor = anchorSection(location.hash);
    if (anchor?.element === section.element && !Number(root.dataset.startOffset)) alignAnchor(anchor);
    goTo(section.start, true);
  }
  restoreStart();
  window.addEventListener('page:restore', restoreStart, { once: true });
}
