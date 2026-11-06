import { initWheelScroll } from './blocks/wheel-scroll.js';
// Точка входа. Нативные ES-модули, без сборщика и внешних зависимостей.
import { initHeader } from './blocks/header.js';
import { initCatalog } from './blocks/catalog.js';
import { initCalculator } from './blocks/calculator.js';
import { initRequest } from './blocks/request.js';
import { initGeography } from './blocks/geography.js';
import { initGallery } from './blocks/gallery.js';
import { initMedia } from './blocks/media.js';
import { initYear } from './blocks/footer.js';
import { initMotion } from './blocks/motion.js';
import { initPageStart } from './blocks/page-start.js';

// Каждый блок запускается независимо от остальных.
const blocks = [
  ['html', initWheelScroll],
  ['[data-header]', initHeader],
  ['[data-catalog]', initCatalog],
  ['[data-calculator]', initCalculator],
  ['[data-request]', initRequest],
  ['[data-gallery-root]', initGallery],
  ['[data-geography]', initGeography],
  ['[data-media]', initMedia],
  ['[data-year]', initYear],
  ['[data-page-motion]', initMotion],
  ['[data-section-scroll]', initPageStart],
];

for (const [selector, initialize] of blocks) {
  for (const element of document.querySelectorAll(selector)) {
    try {
      initialize(element);
    } catch (error) {
      console.error('Не удалось запустить блок ' + selector, error);
    }
  }
}
