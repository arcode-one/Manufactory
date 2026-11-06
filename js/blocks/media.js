// Заглушка при ошибке загрузки изображения
const mediaInstances = new WeakSet();

export function initMedia(image) {
  if (mediaInstances.has(image)) return;
  const fallback = () => {
    if (!image.dataset.fallback || image.dataset.mediaFailed) return;
    image.dataset.mediaFailed = 'true';
    image.removeAttribute('srcset');
    image.src = image.dataset.fallback;
    image.classList.add('media--unavailable');
  };
  image.addEventListener('error', fallback);
  if (image.complete && image.naturalWidth === 0) fallback();
  mediaInstances.add(image);
}
