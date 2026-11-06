// Запускается в head до первого отображения и загрузки ES-модулей.
(() => {
  const page = document.documentElement;
  const enabled = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const key = `manufaktura:screen:${location.pathname}`;
  const navigation = performance.getEntriesByType('navigation')[0];
  let saved;
  if (enabled && navigation?.type === 'reload') {
    try {
      saved = JSON.parse(sessionStorage.getItem(key));
    } catch {
      // Хранилище может быть недоступно в приватном режиме.
    }
  }
  const ids = page.dataset.scrollScreens?.split(/\s+/) || ['hero', 'about', 'products', 'calculator', 'geography', 'projects', 'contacts'];
  const aliases = Object.fromEntries((page.dataset.scrollAnchors || '').split(/\s+/).filter(Boolean).map((pair) => pair.split(':')));
  const hash = location.hash.slice(1);
  const section = ids.includes(saved?.id) ? saved.id : ids.includes(hash) ? hash : aliases[hash] || ids[0];
  page.dataset.startSection = section;
  page.dataset.startOffset = String(ids.includes(saved?.id) ? Math.max(0, Number(saved?.offset) || 0) : 0);
  page.classList.add('page--starting');
  if (enabled) {
    page.classList.add('page--section-scroll');
    history.scrollRestoration = 'manual';
    if (saved && ids.includes(saved.id)) {
      // Колесо могло увести дальше секции, указанной в прежнем якоре.
      history.replaceState(history.state, '', `${location.pathname}${location.search}${section === ids[0] ? '' : `#${section}`}`);
    }
    window.addEventListener('pagehide', () => {
      if (page.classList.contains('page--starting')) return;
      const headerHeight = document.querySelector('[data-header]')?.offsetHeight || 0;
      const screens = [...document.querySelectorAll('[data-scroll-screen]')];
      const current = screens.reduce((nearest, screen, index) => {
        const distance = Math.abs(screen.getBoundingClientRect().top - (index || page.hasAttribute('data-scroll-header') ? headerHeight : 0));
        return !nearest || distance < nearest.distance ? { screen, distance } : nearest;
      }, null)?.screen;
      if (!current) return;
      try {
        sessionStorage.setItem(key, JSON.stringify({ id: current.dataset.scrollScreen, offset: current.scrollTop }));
      } catch {
        // Восстановление по URL продолжает работать без sessionStorage.
      }
    });
  }
  // Если основной JS не загрузился, содержимое всё равно станет доступным.
  setTimeout(() => page.classList.remove('page--starting'), 3000);
})();
