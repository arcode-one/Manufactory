import { initProductPhotos } from './product-photos.js';

// Вкладки каталога и выбор изделия
const catalogInstances = new WeakSet();

export function initCatalog(root) {
  if (catalogInstances.has(root)) return;
  const tabs = [...root.querySelectorAll('[data-catalog-tab]')];
  const panels = [...root.querySelectorAll('[data-catalog-panel]')];
  if (!tabs.length || tabs.length !== panels.length) return;
  const activate = (index, focus = false, animate = false) => {
    const changed = tabs[index].getAttribute('aria-selected') !== 'true';
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) tabs[index].focus({ preventScroll: true });
    if (changed)
      root.dispatchEvent(
        new CustomEvent('catalogchange', {
          bubbles: true,
          detail: { panel: panels[index], animate },
        }),
      );
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', (event) => activate(index, false, event.detail > 0));
    tab.addEventListener('keydown', (event) => {
      const targets = {
        ArrowRight: (index + 1) % tabs.length,
        ArrowLeft: (index - 1 + tabs.length) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      };
      if (!(event.key in targets)) return;
      event.preventDefault();
      activate(targets[event.key], true);
    });
  });
  root.addEventListener('click', (event) => {
    const button = event.target.closest('[data-product]');
    if (!button || !root.contains(button)) return;
    const target = document.getElementById(root.dataset.calculatorTarget);
    target?.dispatchEvent(
      new CustomEvent('selectproduct', { detail: { product: button.dataset.product } }),
    );
  });
  activate(0);
  initProductPhotos(root);
  root.querySelector('[data-catalog-tabs]').hidden = false;
  catalogInstances.add(root);
}
