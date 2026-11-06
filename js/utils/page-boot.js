// Keep native page scrolling and history restoration on every screen size.
(() => {
  const page = document.documentElement;
  page.classList.add('page--starting');
  history.scrollRestoration = 'auto';
  setTimeout(() => page.classList.remove('page--starting'), 3000);
})();
