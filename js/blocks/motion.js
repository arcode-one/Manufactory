// Анимации и параллакс
const motionInstances = new WeakSet();

export function initMotion(root) {
  if (motionInstances.has(root)) return;
  motionInstances.add(root);
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width: 760px), (pointer: coarse)');
  const ease = getComputedStyle(root).getPropertyValue('--ease').trim();
  let cleanup = () => {};

  function mountMotion() {
    root.classList.add('page--motion');
    let disposed = false;
    let frame = 0;
    let lastTime = 0;
    let needsMeasure = true;
    let keyboard = false;
    const active = new Set();
    const effects = new Map();
    const reveals = [];
    const removers = [];
    const images = root.querySelectorAll('[data-parallax], .product__image > .product__photo');
    const photos = [...images].map((image) => {
      const container = image.parentElement;
      const layer = document.createElement('picture');
      layer.className = 'parallax__layer';
      image.before(layer);
      layer.append(image);
      return { container, layer, image, top: 0, height: 0, range: 0, current: null, target: 0 };
    });
    const byContainer = new Map(photos.map((photo) => [photo.container, photo]));

    function listen(target, type, listener, options) {
      target.addEventListener(type, listener, options);
      removers.push(() => target.removeEventListener(type, listener, options));
    }
    function play(element, keyframes, duration = 300) {
      if (!element || keyboard || disposed) return;
      effects.get(element)?.cancel();
      const effect = element.animate(keyframes, { duration, easing: ease });
      effects.set(element, effect);
      effect.finished
        .then(() => {
          if (effects.get(element) === effect) effects.delete(element);
        })
        .catch(() => {});
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          target.classList.toggle('motion--revealed', isIntersecting);
          if (!isIntersecting) target.classList.remove('motion--instant');
        });
      },
    );

    function showVisiblePanelContent(panel) {
      panel.querySelectorAll('[data-motion]').forEach((element) => {
        const { top, bottom, height } = element.getBoundingClientRect();
        if (height && top < innerHeight && bottom > 0) {
          element.classList.add('motion--instant', 'motion--revealed');
        }
      });
    }
    const revealCounts = new Map();
    root.querySelectorAll('[data-reveal]').forEach((element) => {
      const kind = element.dataset.reveal;
      const index = revealCounts.get(kind) ?? 0;
      revealCounts.set(kind, index + 1);
      element.dataset.motion = kind;
      if (kind !== 'frame' && kind !== 'line')
        element.style.setProperty('--motion-delay', `${(index % 3) * 65}ms`);
      reveals.push(element);
      revealObserver.observe(element);
    });

    function schedule() {
      if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(draw);
    }
    function invalidate() {
      needsMeasure = true;
      schedule();
    }
    const visibility = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const photo = byContainer.get(entry.target);
          photo.layer.classList.toggle('parallax__layer--visible', entry.isIntersecting);
          if (entry.isIntersecting) active.add(photo);
          else active.delete(photo);
        });
        invalidate();
      },
      { rootMargin: '80px 0px', threshold: 0 },
    );
    photos.forEach((photo) => visibility.observe(photo.container));

    function draw(time) {
      frame = 0;
      if (disposed || document.hidden) return;
      const y = window.scrollY;
      const viewport = window.innerHeight;
      if (needsMeasure) {
        // Read layout before writing any transforms. Cache positions until geometry changes.
        photos.forEach((photo) => {
          const bounds = photo.container.getBoundingClientRect();
          photo.top = bounds.top + y;
          photo.height = bounds.height;
          photo.range = Math.min(
            compact.matches ? 28 : 64,
            bounds.height * (compact.matches ? 0.035 : 0.065),
          );
        });
        needsMeasure = false;
      }
      const dt = lastTime ? Math.min(64, time - lastTime) : 1000 / 60;
      const follow = 1 - Math.exp(-dt / 165);
      let unsettled = false;
      active.forEach((photo) => {
        if (!photo.height) return;
        const progress = Math.min(
          1,
          Math.max(0, (y + viewport - photo.top) / (viewport + photo.height)),
        );
        photo.target = (progress * 2 - 1) * photo.range;
        if (photo.current === null) photo.current = photo.target;
        photo.current += (photo.target - photo.current) * follow;
        if (Math.abs(photo.target - photo.current) < 0.05) photo.current = photo.target;
        else unsettled = true;
        photo.layer.style.transform = `translate3d(0, ${photo.current.toFixed(2)}px, 0)`;
      });
      lastTime = unsettled ? time : 0;
      if (unsettled) schedule();
    }

    const resize = new ResizeObserver(invalidate);
    resize.observe(document.body);
    photos.forEach((photo) => resize.observe(photo.container));
    listen(window, 'scroll', (event) => {
      if (event.target === document) schedule();
      else invalidate();
    }, { passive: true, capture: true });
    listen(window, 'resize', invalidate, { passive: true });
    listen(window, 'pageshow', invalidate);
    listen(document, 'load', invalidate, true);
    listen(document, 'visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        lastTime = 0;
      } else invalidate();
    });
    listen(
      document,
      'keydown',
      (event) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        keyboard = true;
        root.classList.add('page--keyboard');
        effects.forEach((effect) => effect.cancel());
        effects.clear();
      },
      true,
    );
    function usePointerMotion() {
      if (!keyboard) return;
      keyboard = false;
      root.classList.remove('page--keyboard');
    }
    listen(document, 'pointerdown', usePointerMotion, true);
    listen(document, 'wheel', usePointerMotion, { capture: true, passive: true });
    listen(root, 'catalogchange', (event) => {
      const panel = event.detail.panel;
      showVisiblePanelContent(panel);
      if (event.detail.animate)
        play(panel, [
          { opacity: 0.5, transform: 'translate3d(0, 6px, 0)' },
          { opacity: 1, transform: 'translate3d(0, 0, 0)' },
        ]);
      invalidate();
    });
    listen(root, 'productchange', (event) => {
      play(
        event.target.querySelector('[data-model-transition]'),
        [{ opacity: 0.45 }, { opacity: 1 }],
        260,
      );
      play(
        event.target.querySelector('[data-drawing]'),
        [{ opacity: 0.45 }, { opacity: 1 }],
        260,
      );
    });
    listen(root, 'gallerychange', (event) => {
      const image = event.target.querySelector('[data-lightbox-image]');
      const nextSource = image.src;
      effects.get(image)?.cancel();
      image
        .decode()
        .catch(() => {})
        .then(() => {
          if (!disposed && image.src === nextSource && event.target.open) {
            play(
              image,
              [
                { opacity: 0.35, transform: 'scale(.99)' },
                { opacity: 1, transform: 'scale(1)' },
              ],
              280,
            );
          }
        });
    });
    document.fonts?.ready.then(() => {
      if (!disposed) invalidate();
    });
    invalidate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      visibility.disconnect();
      revealObserver.disconnect();
      resize.disconnect();
      removers.forEach((remove) => remove());
      effects.forEach((effect) => effect.cancel());
      root.classList.remove('page--motion', 'page--keyboard');
      reveals.forEach((element) => {
        delete element.dataset.motion;
        element.classList.remove('motion--revealed', 'motion--instant');
        element.style.removeProperty('--motion-delay');
      });
      photos.forEach((photo) => photo.layer.replaceWith(photo.image));
    };
  }

  function sync() {
    cleanup();
    cleanup = () => {};
    if (
      !preference.matches &&
      'IntersectionObserver' in window &&
      'ResizeObserver' in window &&
      typeof Element.prototype.animate === 'function'
    ) {
      cleanup = mountMotion();
    }
  }
  preference.addEventListener('change', sync);
  sync();
}
