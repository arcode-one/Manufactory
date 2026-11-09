import { getGalleryViewer } from './gallery.js';
import { bindPhotoGesture } from '../utils/photo-gesture.js';

export function initProductPhotos(root) {
  const template = root.querySelector('[data-product-photo-controls]');
  const dialog = document.getElementById(root.dataset.productLightbox);
  if (!template || !dialog) return;
  const open = getGalleryViewer(dialog);

  root.querySelectorAll('[data-product-gallery]').forEach((gallery) => {
    const image = gallery.querySelector('.product__photo');
    const extras = gallery.dataset.productPhotos?.match(/\S+/g);
    if (!image || !extras?.length) return;

    const title = image.alt;
    const firstSrcset = image.getAttribute('srcset');
    const photos = [{
      src: image.getAttribute('src'),
      width: Number(image.getAttribute('width')),
      height: Number(image.getAttribute('height')),
      alt: title,
    }, ...extras.map((entry, i) => {
      const [name, size] = entry.split(':');
      const [width, height] = size.split('x').map(Number);
      return {
        src: `images/products/${name}.webp`,
        width,
        height,
        alt: `${title}, фото ${i + 2}`,
      };
    })];
    let index = 0;
    gallery.append(template.content.cloneNode(true));
    const trigger = gallery.querySelector('[data-product-photo-open]');
    const count = gallery.querySelector('[data-photo-count]');
    const updateControls = () => {
      count.value = `${index + 1} / ${photos.length}`;
      trigger.setAttribute('aria-label', `Увеличить фото ${index + 1}. ${title}`);
    };
    updateControls();

    function step(direction) {
      index = (index + direction + photos.length) % photos.length;
      const photo = photos[index];
      delete image.dataset.mediaFailed;
      image.classList.remove('media--unavailable');
      image.toggleAttribute('data-photo-secondary', index !== 0);
      image.alt = photo.alt;
      if (index === 0 && firstSrcset) image.srcset = firstSrcset;
      else image.removeAttribute('srcset');
      image.src = photo.src;
      updateControls();
    }

    gallery.querySelectorAll('[data-photo-step]').forEach((button) => {
      const change = () => step(Number(button.dataset.photoStep));
      button.addEventListener('click', change);
      bindPhotoGesture(button, { tap: change });
    });

    gallery.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    });

    const zoom = () => open(photos, index, trigger, { hideCount: true });
    bindPhotoGesture(trigger, { swipe: step, tap: zoom, mouseDrag: true });
    trigger.addEventListener('click', zoom);
  });
}
