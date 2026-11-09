import { createDialog } from '../utils/dialog.js';
import { bindPhotoGesture } from '../utils/photo-gesture.js';

// Просмотр фотографий и чертежей
const galleryInstances = new WeakSet();
const galleryViewers = new WeakMap();

export function getGalleryViewer(dialogElement) {
  if (galleryViewers.has(dialogElement)) return galleryViewers.get(dialogElement);
  const dialog = createDialog(dialogElement);
  const image = dialogElement.querySelector('[data-lightbox-image]');
  const caption = dialogElement.querySelector('[data-lightbox-caption]');
  const count = dialogElement.querySelector('[data-lightbox-count]');
  const scrollArea = dialogElement.querySelector('[data-lightbox-scroll]');
  const photoViewer = dialogElement.classList.contains('lightbox--photo');
  if (photoViewer) {
    let startedOutside = false;
    dialogElement.addEventListener('pointerdown', (event) => {
      startedOutside = event.target === dialogElement;
    });
    dialogElement.addEventListener('click', (event) => {
      if (startedOutside && event.target === dialogElement) dialog.close();
    });
  }
  let photos = [];
  let index = 0;
  const show = (next, animate = false) => {
    index = (next + photos.length) % photos.length;
    const { src, alt, width, height, title } = photos[index];
    delete image.dataset.mediaFailed;
    image.classList.remove('media--unavailable');
    image.src = src;
    image.alt = alt;
    if (width && height) {
      image.width = width;
      image.height = height;
      if (photoViewer) dialogElement.style.setProperty('--lightbox-ratio', width / height);
    } else {
      image.removeAttribute('width');
      image.removeAttribute('height');
    }
    if (scrollArea) {
      scrollArea.scrollLeft = 0;
      scrollArea.scrollTop = 0;
    }
    caption.textContent = title ?? '';
    caption.hidden = !title;
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}`;
    if (animate) dialogElement.dispatchEvent(new CustomEvent('gallerychange', { bubbles: true }));
  };
  const steps = dialogElement.querySelectorAll('[data-lightbox-step]');
  if (photoViewer) {
    bindPhotoGesture(image, {
      mouseDrag: true,
      swipe: (direction) => {
        if (photos.length > 1) show(index + direction, true);
      },
    });
    const closeButton = dialogElement.querySelector('[data-dialog-close]');
    if (closeButton) bindPhotoGesture(closeButton, { tap: dialog.close });
  }
  steps.forEach((button) => {
    const step = (animate) => show(index + Number(button.dataset.lightboxStep), animate);
    button.addEventListener('click', (event) => step(event.detail > 0));
    if (photoViewer) bindPhotoGesture(button, { tap: () => step(true) });
  });
  dialogElement.addEventListener('keydown', (event) => {
    if (photos.length < 2 || event.target.closest('[data-lightbox-scroll]')) return;
    if (['ArrowRight', 'ArrowLeft'].includes(event.key)) {
      event.preventDefault();
      show(index + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  const open = (group, startIndex, origin, { hideCount = false } = {}) => {
    photos = group;
    count.hidden = hideCount;
    steps.forEach((button) => { button.hidden = photos.length < 2; });
    show(startIndex);
    dialog.open(origin);
  };
  galleryViewers.set(dialogElement, open);
  return open;
}

export function initGallery(root) {
  if (galleryInstances.has(root)) return;
  const dialogElement = document.getElementById(root.dataset.lightboxTarget);
  const triggers = [...root.querySelectorAll('[data-gallery]')].filter((trigger) =>
    trigger.querySelector('img'),
  );
  if (!dialogElement || !triggers.length) return;
  const open = getGalleryViewer(dialogElement);
  triggers.forEach((trigger, index) =>
    trigger.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const photos = triggers.map((item) => {
        const image = item.querySelector('img');
        return {
          src: image.dataset.fullSrc || image.src,
          alt: image.alt,
          width: Number(image.getAttribute('width')),
          height: Number(image.getAttribute('height')),
          title: item.dataset.galleryCaption ||
            item.querySelector('[data-gallery-caption]')?.textContent.trim() || image.alt,
        };
      });
      open(photos, index, trigger);
    }),
  );
  galleryInstances.add(root);
}
