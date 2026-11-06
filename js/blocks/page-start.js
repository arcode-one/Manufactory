// Показываем страницу после выравнивания секций и загрузки шрифта.
export function initPageStart(root) {
  const shown = new Promise((resolve) => {
    if (document.readyState === 'complete') resolve();
    else window.addEventListener('pageshow', resolve, { once: true });
  });
  const finish = () => requestAnimationFrame(() => {
    window.dispatchEvent(new Event('page:restore'));
    window.dispatchEvent(new Event('page:ready'));
    root.classList.remove('page--starting');
  });
  Promise.all([shown, document.fonts?.ready]).then(finish, finish);
}
