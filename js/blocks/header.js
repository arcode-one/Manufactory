// Шапка и полное меню сайта
const headerInstances = new WeakSet();

export function initHeader(root) {
  if (headerInstances.has(root)) return;
  headerInstances.add(root);
  const toggle = root.querySelector('[data-menu-toggle]');
  const menu = document.getElementById(toggle?.getAttribute('aria-controls'));
  const overlay = root.hasAttribute('data-header-overlay');
  const revealAt = 24;
  const clearAt = 4;
  let scrolled = window.scrollY > revealAt;
  let transparent;
  const syncSurface = () => {
    // Разные пороги не дают шапке мигать при небольшом движении около начала страницы.
    scrolled = window.scrollY > (scrolled ? clearAt : revealAt);
    const next = overlay && !scrolled && (!menu || menu.hidden);
    if (next === transparent) return;
    transparent = next;
    root.classList.toggle('header--transparent', next);
  };
  // Прозрачность уже задана в HTML. Уточняем положение скролла до включения переходов.
  syncSurface();
  const ready = () => {
    syncSurface();
    requestAnimationFrame(() => root.classList.add('header--ready'));
  };
  if (document.documentElement.classList.contains('page--starting')) {
    window.addEventListener('page:ready', ready, { once: true });
  } else ready();
  if (overlay) {
    window.addEventListener('scroll', syncSurface, { passive: true });
    window.addEventListener('pageshow', syncSurface);
  }
  if (!toggle || !menu) return;
  const hoverDevice = window.matchMedia('(hover: hover) and (pointer: fine)');
  let openedByHover = false;
  let overToggle = false;
  let overMenu = false;
  let closeTimer;
  const cancelClose = () => clearTimeout(closeTimer);
  const setOpen = (open, fromHover = false) => {
    cancelClose();
    openedByHover = open && fromHover;
    if (!open) {
      overToggle = false;
      overMenu = false;
    }
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.hidden = !open;
    syncSurface();
  };
  const scheduleClose = () => {
    cancelClose();
    if (!openedByHover) return;
    closeTimer = setTimeout(() => {
      if (!overToggle && !overMenu && !menu.contains(document.activeElement)) setOpen(false);
    }, 220);
  };
  toggle.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse' || !hoverDevice.matches) return;
    overToggle = true;
    cancelClose();
    if (menu.hidden) setOpen(true, true);
  });
  toggle.addEventListener('pointerleave', () => {
    overToggle = false;
    scheduleClose();
  });
  menu.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse' || !hoverDevice.matches) return;
    overMenu = true;
    cancelClose();
  });
  menu.addEventListener('pointerleave', () => {
    overMenu = false;
    scheduleClose();
  });
  hoverDevice.addEventListener('change', () => {
    overToggle = false;
    overMenu = false;
    cancelClose();
    if (openedByHover) setOpen(false);
  });
  toggle.addEventListener('click', (event) => {
    // Первый клик закрепляет меню, если оно уже открылось по наведению.
    const open = openedByHover || menu.hidden;
    setOpen(open);
    if (open && event.detail === 0) menu.querySelector('a')?.focus({ preventScroll: true });
  });
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a, [data-open-request]')) setOpen(false);
  });
  root.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  const closeOutside = (event) => {
    if (!menu.hidden && !root.contains(event.target) && !menu.contains(event.target)) {
      setOpen(false);
    }
  };
  document.addEventListener('pointerdown', closeOutside);
  document.addEventListener('focusin', closeOutside);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      toggle.focus({ preventScroll: true });
    }
  });
}
