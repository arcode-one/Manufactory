import { getGalleryViewer } from './gallery.js';
import { bindPhotoGesture } from '../utils/photo-gesture.js';

export function initProductPhotos(root) {
  const template = root.querySelector('[data-product-photo-controls]');
  const dialog = document.getElementById(root.dataset.productLightbox);
  if (!template || !dialog) return;
  const open = getGalleryViewer(dialog);
  const warmups = new WeakMap();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      warmups.get(target)();
      observer.unobserve(target);
    });
  }, { rootMargin: '240px 0px' });

  root.querySelectorAll('[data-product-gallery]').forEach((gallery) => {
    const image = gallery.querySelector('.product__photo');
    const extras = gallery.dataset.productPhotos?.match(/\S+/g);
    if (!image || !extras?.length) return;

    const title = image.alt;
    const firstSrcset = image.getAttribute('srcset');
    // Extra photos use name:widthxheight[:vertical position in percent].
    const firstPosition = image.style.getPropertyValue('--product-photo-y');
    const photos = [{
      src: image.getAttribute('src'),
      width: Number(image.getAttribute('width')),
      height: Number(image.getAttribute('height')),
      alt: title,
      position: firstPosition,
    }, ...extras.map((entry, i) => {
      const [name, size, vertical] = entry.split(':');
      const [width, height] = size.split('x').map(Number);
      return {
        src: `images/products/${name}.webp`,
        width,
        height,
        alt: `${title}, фото ${i + 2}`,
        position: vertical === undefined ? '' : `${vertical}%`,
      };
    })];
    let index = 0;
    let requestedIndex = 0;
    const requests = new Map();
    const wrap = (next) => (next + photos.length) % photos.length;

    function prepare(next) {
      if (!requests.has(next)) {
        const preview = new Image();
        if (next === 0 && firstSrcset) {
          preview.sizes = image.sizes;
          preview.srcset = firstSrcset;
        }
        preview.src = photos[next].src;
        const ready = preview.decode().catch(() => {
          if (requests.get(next)?.preview === preview) requests.delete(next);
        });
        requests.set(next, { preview, ready });
      }
      return requests.get(next).ready;
    }

    function warmNeighbors() {
      const neighbors = [wrap(index - 1), wrap(index + 1)];
      for (const next of requests.keys()) {
        if (next !== index && next !== requestedIndex && !neighbors.includes(next)) requests.delete(next);
      }
      neighbors.forEach(prepare);
    }
    warmups.set(gallery, warmNeighbors);
    observer.observe(gallery);

    gallery.append(template.content.cloneNode(true));
    const trigger = gallery.querySelector('[data-product-photo-open]');
    const count = gallery.querySelector('[data-photo-count]');
    const updateControls = () => {
      count.value = `${index + 1} / ${photos.length}`;
      trigger.setAttribute('aria-label', `Увеличить фото ${index + 1}. ${title}`);
    };
    updateControls();

    async function step(direction) {
      const next = wrap(requestedIndex + direction);
      requestedIndex = next;
      if (next === index) return;
      await prepare(next);
      if (next !== requestedIndex || next === index) return;

      // Keep the visible frame and its crop together until the next frame can be painted.
      index = next;
      const photo = photos[index];
      delete image.dataset.mediaFailed;
      image.classList.remove('media--unavailable');
      image.toggleAttribute('data-photo-secondary', index !== 0);
      image.style.setProperty('--product-photo-y', photo.position);
      image.alt = photo.alt;
      if (index === 0 && firstSrcset) image.srcset = firstSrcset;
      else image.removeAttribute('srcset');
      image.src = photo.src;
      updateControls();
      warmNeighbors();
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

    // Pointer opens rely on native focus restoration to avoid a keyboard highlight after a tap.
    const zoom = (origin) => open(photos, index, origin, { hideCount: true });
    bindPhotoGesture(trigger, { swipe: step, tap: () => zoom(null), mouseDrag: true });
    trigger.addEventListener('click', (event) => zoom(event.detail === 0 ? trigger : null));
  });
}
