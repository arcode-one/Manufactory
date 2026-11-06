import { createDialog } from '../utils/dialog.js';

// Просмотр фотографий и чертежей
const galleryInstances = new WeakSet();

export function initGallery(root) {
  if (galleryInstances.has(root)) return;
  const dialogElement = document.getElementById(root.dataset.lightboxTarget);
  const triggers = [...root.querySelectorAll('[data-gallery]')].filter((button) =>
    button.querySelector('img'),
  );
  if (!dialogElement || !triggers.length) return;
  const dialog = createDialog(dialogElement);
  const image = dialogElement.querySelector('[data-lightbox-image]');
  const caption = dialogElement.querySelector('[data-lightbox-caption]');
  const count = dialogElement.querySelector('[data-lightbox-count]');
  const scrollArea = dialogElement.querySelector('[data-lightbox-scroll]');
  if (dialogElement.classList.contains('lightbox--photo')) {
    let startedOutside = false;
    dialogElement.addEventListener('pointerdown', (event) => {
      startedOutside = event.target === dialogElement;
    });
    dialogElement.addEventListener('click', (event) => {
      if (startedOutside && event.target === dialogElement) dialog.close();
    });
  }
  let index = 0;
  const show = (next, animate = false) => {
    index = (next + triggers.length) % triggers.length;
    const trigger = triggers[index];
    const source = trigger.querySelector('img');
    image.src = source.dataset.fullSrc || source.src;
    image.alt = source.alt;
    image.width = Number(source.getAttribute('width'));
    image.height = Number(source.getAttribute('height'));
    if (dialogElement.classList.contains('lightbox--photo')) {
      dialogElement.style.setProperty(
        '--lightbox-ratio',
        Number(source.getAttribute('width')) / Number(source.getAttribute('height')),
      );
    }
    if (scrollArea) {
      scrollArea.scrollLeft = 0;
      scrollArea.scrollTop = 0;
    }
    const text =
      trigger.querySelector('[data-gallery-caption]')?.textContent.trim() || source.alt;
    caption.textContent = text;
    caption.hidden = !text;
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(triggers.length).padStart(2, '0')}`;
    if (animate) dialogElement.dispatchEvent(new CustomEvent('gallerychange', { bubbles: true }));
  };
  triggers.forEach((trigger, i) =>
    trigger.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      show(i);
      dialog.open(trigger);
    }),
  );
  dialogElement.querySelectorAll('[data-lightbox-step]').forEach((button) => {
    button.hidden = triggers.length < 2;
    button.addEventListener('click', (event) =>
      show(index + Number(button.dataset.lightboxStep), event.detail > 0),
    );
  });
  dialogElement.addEventListener('keydown', (event) => {
    if (event.target.closest('[data-lightbox-scroll]')) return;
    if (['ArrowRight', 'ArrowLeft'].includes(event.key)) {
      event.preventDefault();
      show(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  galleryInstances.add(root);
}
