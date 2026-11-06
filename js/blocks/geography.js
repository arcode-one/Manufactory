// Города уже присутствуют в HTML: список доступен без JS и сетевых запросов.
const instances = new WeakSet();
const normalize = (value) => value.toLocaleLowerCase('ru').replaceAll('ё', 'е').trim();

export function initGeography(root) {
  if (instances.has(root)) return;
  instances.add(root);
  const canvas = root.querySelector('.geography__canvas');
  const svg = root.querySelector('.geography__svg');
  const tooltip = root.querySelector('[data-map-tooltip]');
  const name = root.querySelector('[data-map-name]');
  const selection = root.querySelector('[data-map-selection]');
  const status = root.querySelector('[data-city-status]');
  const search = root.querySelector('[data-city-search]');
  const count = root.querySelector('[data-city-count]');
  const empty = root.querySelector('[data-city-empty]');
  const buttons = [...root.querySelectorAll('[data-city]')];
  const points = new Map([...root.querySelectorAll('[data-map-city]')].map((point) => [point.dataset.mapCity, point]));
  const cities = new Map(buttons.map((button) => [button.dataset.city, {
    id: button.dataset.city, name: button.textContent.trim(),
    x: Number(button.dataset.x), y: Number(button.dataset.y), button,
  }]));
  const home = { id: 'ekaterinburg', name: 'Екатеринбург', x: 275.9699, y: 348.2828 };
  const productionLabels = [...root.querySelectorAll('[data-production]')];
  const production = new Map(productionLabels.map((label) => [label.dataset.production, {
    ...(cities.get(label.dataset.production) || home), label,
    line: root.querySelector(`[data-production-line="${label.dataset.production}"]`),
  }]));
  let active = null;
  function dismiss() {
    if (!active) return;
    active = null;
    tooltip.hidden = true;
    selection.style.display = 'none';
    for (const button of buttons) button.setAttribute('aria-pressed', 'false');
    for (const point of points.values()) point.classList.remove('is-selected');
    for (const city of production.values()) city.label.setAttribute('aria-pressed', 'false');
    status.textContent = 'Производство: Москва, Екатеринбург';
  }
  function positionLabel() {
    if (!canvas.clientWidth || !canvas.clientHeight) return;
    const mapHeight = matchMedia('(min-width: 1121px)').matches
      ? Math.max(482, Math.min(578.28, 1000 * canvas.clientHeight / canvas.clientWidth))
      : 578.28;
    svg.setAttribute('viewBox', `0 ${578.28 - mapHeight} 1000 ${mapHeight}`);
    const matrix = svg.getScreenCTM();
    if (!matrix || !canvas.clientWidth) return;
    // Increase spacing on the map without enlarging the dots along with it.
    const zoom = Math.hypot(matrix.a, matrix.b) / Math.min(canvas.clientWidth / 1000, canvas.clientHeight / 578.28);
    for (const [id, point] of points) point.setAttribute('r', (production.has(id) ? 5.5 : 3.4) / zoom);
    for (const ring of root.querySelectorAll('.geography__origin-ring')) ring.setAttribute('r', 11 / zoom);
    root.querySelector('.geography__origin-dot').setAttribute('r', 5.5 / zoom);
    selection.setAttribute('r', 12 / zoom);
    const rect = canvas.getBoundingClientRect();
    const labelRects = [];
    for (const city of production.values()) {
      const point = new DOMPoint(city.x, city.y).matrixTransform(matrix);
      const width = city.label.offsetWidth;
      const height = city.label.offsetHeight;
      const x = point.x - rect.left;
      const y = point.y - rect.top;
      // Anchor the visible text, not a tall button box, close to its marker.
      const radius = 11 * Math.hypot(matrix.a, matrix.b) / zoom;
      const offsetY = city.id === home.id ? 12 : city.id === 'city-18' ? (canvas.clientWidth < 400 ? -26 : -18) : -12;
      const left = Math.max(4, Math.min(x + Math.max(16, radius + 9), canvas.clientWidth - width - 4));
      const top = Math.max(4, Math.min(y + offsetY - height / 2, canvas.clientHeight - height - 4));
      city.label.style.left = `${Math.round(left)}px`;
      city.label.style.top = `${Math.round(top)}px`;
      const endX = left - 3;
      const endY = top + height / 2;
      const distance = Math.hypot(endX - x, endY - y);
      const start = Math.min(0.8, (radius + 2) / distance);
      city.line.setAttribute('x1', x + (endX - x) * start);
      city.line.setAttribute('y1', y + (endY - y) * start);
      city.line.setAttribute('x2', endX);
      city.line.setAttribute('y2', endY);
      labelRects.push({ left, top, right: left + width, bottom: top + height });
    }
    if (!active || production.has(active.id)) {
      tooltip.hidden = true;
      return;
    }
    const point = new DOMPoint(active.x, active.y).matrixTransform(matrix);
    const x = point.x - rect.left;
    const y = point.y - rect.top;
    tooltip.hidden = false;
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    let left = Math.max(8, Math.min(x - width / 2, canvas.clientWidth - width - 8));
    let top = y > height + 24 ? y - height - 16 : y + 16;
    // Keep the selected delivery city clear of the permanent production labels.
    const candidates = [top, y + 16, ...labelRects.map((box) => box.bottom + 8), 8];
    placement: for (const candidateLeft of [left, 8, canvas.clientWidth - width - 8]) {
      for (const candidate of candidates) {
        const bounded = Math.max(8, Math.min(candidate, canvas.clientHeight - height - 8));
        if (labelRects.every((box) => candidateLeft + width + 6 <= box.left || candidateLeft >= box.right + 6 || bounded + height + 6 <= box.top || bounded >= box.bottom + 6)) {
          left = candidateLeft;
          top = bounded;
          break placement;
        }
      }
    }
    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(Math.max(8, Math.min(top, canvas.clientHeight - height - 8)))}px`;
  }

  function select(city, revealMap = false) {
    active = city;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.city === city.id));
    for (const [id, point] of points) point.classList.toggle('is-selected', id === city.id);
    name.textContent = city.name;
    for (const location of production.values()) location.label.setAttribute('aria-pressed', String(location.id === city.id));
    selection.style.display = '';
    selection.setAttribute('cx', city.x);
    selection.setAttribute('cy', city.y);
    status.textContent = `На карте: ${city.name}${production.has(city.id) ? ' · производство' : ''}`;
    positionLabel();
    if (revealMap) {
      const screen = root.closest('[data-scroll-screen]');
      const headerHeight = document.querySelector('[data-header]')?.getBoundingClientRect().height || 0;
      // Native focus can scroll both the section and the document. Keep the section below the header.
      if (screen && document.documentElement.classList.contains('page--section-scroll')) {
        window.scrollTo({ top: scrollY + screen.getBoundingClientRect().top - headerHeight, behavior: 'instant' });
      }
      if (!matchMedia('(max-width: 1120px)').matches) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.bottom < headerHeight + 80 || rect.top > innerHeight - 80) {
        const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
        if (screen && screen.scrollHeight > screen.clientHeight && getComputedStyle(screen).overflowY === 'auto') {
          screen.scrollTo({ top: screen.scrollTop + rect.top - screen.getBoundingClientRect().top - 12, behavior });
        } else canvas.scrollIntoView({ block: 'center', behavior });
      }
    }
  }

  root.querySelector('.geography__cities').addEventListener('click', (event) => {
    const button = event.target.closest('[data-city]');
    if (button) select(cities.get(button.dataset.city), true);
  });
  svg.addEventListener('click', (event) => {
    if (event.target.closest('#map-origin')) {
      select(home, true);
      return;
    }
    const point = event.target.closest('[data-map-city]');
    if (point) select(cities.get(point.dataset.mapCity), true);
  });
  for (const city of production.values()) city.label.addEventListener('click', () => select(city, true));
  const origin = root.querySelector('#map-origin');
  origin.setAttribute('role', 'button');
  origin.setAttribute('tabindex', '0');
  origin.setAttribute('aria-label', 'Екатеринбург, производство');
  origin.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select(home, true);
    }
  });
  document.addEventListener('pointerdown', (event) => {
    const control = event.target.closest('[data-city], [data-map-city], [data-production], #map-origin');
    if (!control || !root.contains(control)) dismiss();
  });
  // User scroll intent closes the selection; our own mobile scroll-to-map does not.
  document.addEventListener('wheel', dismiss, { passive: true, capture: true });
  document.addEventListener('touchmove', dismiss, { passive: true, capture: true });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') dismiss();
    const editing = event.target.closest('input, textarea, select, [contenteditable="true"]');
    const activatingButton = event.key === ' ' && event.target.closest('button, [role="button"]');
    if (!editing && !activatingButton && !event.defaultPrevented &&
        ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) dismiss();
  });
  search.addEventListener('input', () => {
    const query = normalize(search.value);
    let found = 0;
    for (const city of cities.values()) {
      const matches = normalize(city.name).includes(query);
      city.button.parentElement.hidden = !matches;
      if (matches) found++;
    }
    count.textContent = query ? `${found} / ${cities.size}` : String(cities.size);
    empty.hidden = found > 0;
  });
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && search.value) {
      search.value = '';
      search.dispatchEvent(new Event('input'));
    }
  });
  root.querySelector('[data-city-search-label]').hidden = false;
  const observer = new ResizeObserver(positionLabel);
  observer.observe(canvas);
  document.fonts.ready.then(positionLabel);
  selection.style.display = 'none';
  positionLabel();
}
