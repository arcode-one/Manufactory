import { initCalculatorSelects } from './calculator-select.js';
import { selectionFrom, validateSelection } from './calculator-model.js';
import { initRequest } from './request.js';

// Калькулятор: размеры, количество и комплектация
const calculatorInstances = new WeakSet();

const drawingBases = {
  flat60: [[88, 153], [220, 222], [431, 159]],
  flat80: [[88, 163], [220, 232], [431, 169]],
  modern: [[115, 193], [229, 252], [411, 198]],
};

function updateDrawingDimensions(root, product) {
  const [left, front, right] = drawingBases[product] || drawingBases.modern;
  const extensions = [];
  for (const [name, start, end] of [
    ['width', left, front],
    ['length', front, right],
  ]) {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const size = Math.hypot(dx, dy);
    const normal = [-dy / size, dx / size];
    const offset = (point, distance) =>
      point.map((value, axis) => value + normal[axis] * distance);
    const line = root.querySelector(`[data-dimension-line="${name}"]`);
    line.setAttribute('d', `M${offset(start, 20)}L${offset(end, 20)}`);
    for (const point of [start, end]) {
      extensions.push(`M${offset(point, 4)}L${offset(point, 28)}`);
    }
    const midpoint = start.map((value, axis) => (value + end[axis]) / 2);
    const [x, y] = offset(midpoint, 40);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const label = root.querySelector(`[data-dimension="${name}"]`);
    label.setAttribute('x', x);
    label.setAttribute('y', y);
    label.setAttribute('transform', `rotate(${angle} ${x} ${y})`);
  }
  root.querySelector('[data-dimension-extensions]').setAttribute('d', extensions.join(''));
}

export function initCalculator(root) {
  if (calculatorInstances.has(root)) return;
  const form = root.querySelector('[data-calculator-form]');
  const error = root.querySelector('[data-calculator-error]');
  if (!form || !error) return;
  const find = (selector) => root.querySelector(selector);
  const selection = () => selectionFrom(new FormData(form));
  const sizes = form.querySelector('[data-sizes]');
  const addSize = form.querySelector('[data-add-size]');
  const removeSize = form.querySelector('[data-remove-size]');
  // Preserve form association while moving desktop controls above the drawing.
  const extras = find('.calculator__extras');
  const visual = find('.calculator__visual');
  const visualColumn = document.createElement('div');
  visualColumn.className = 'calculator__visual-column';
  visual.before(visualColumn);
  visualColumn.append(visual);
  extras.querySelectorAll('input, select').forEach(control => control.setAttribute('form', form.id));
  const desktopLayout = matchMedia('(width > 1120px)');
  const arrangeControls = () => {
    if (desktopLayout.matches) visualColumn.prepend(extras);
    else error.before(extras);
  };
  desktopLayout.addEventListener('change', arrangeControls);
  arrangeControls();
  initCalculatorSelects(root);
  let rowId = 1;
  function refreshRows() {
    const rows = [...sizes.children];
    rows.forEach((row,i)=>{
      row.querySelector('[data-size-title]').textContent = `Размер ${i+1}`;
    });
    addSize.disabled = rows.length >= 20;
    removeSize.hidden = rows.length === 1;
  }
  const update = () => {
    const previous = find('[data-summary="model"]').textContent;
    let selected = selection();
    const custom = form.elements.color.value === 'other';
    find('[data-custom-color]').hidden = !custom;
    form.elements.customColor.disabled = !custom;
    form.elements.customColor.required = custom;
    form.elements.mesh.disabled = !selected.model.chimney;
    if (form.elements.mesh.disabled) form.elements.mesh.checked = false;
    selected = selection();
    const valid = !validateSelection(selected);
    const values = {
      model: selected.model.name,
      purpose: selected.model.purpose,
      size: selected.items.map(item=>`${item.length || '—'} × ${item.width || '—'} мм · ${item.quantity || '—'} шт.`).join('\n'),
      quantity:
        Number.isInteger(selected.quantity) && selected.quantity > 0
          ? `${selected.quantity} шт.`
          : 'Проверьте количество',
      extras: selected.options.join(', ') || 'Без дополнительных опций',
    };
    Object.entries(values).forEach(([name, value]) => {
      find(`[data-summary="${name}"]`).textContent = value;
    });
    for (const [dimension, label] of [
      ['width', 'Ширина'],
      ['length', 'Длина'],
    ]) {
      find(`[data-dimension="${dimension}"]`).textContent =
        selected[dimension] > 0 && selected[dimension] <= 3000
          ? `${selected[dimension]} мм`
          : label;
    }
    for (const product of ['flat60', 'flat80']) {
      find(`[data-drawing-part="${product}"]`).toggleAttribute('hidden', selected.product !== product);
    }
    find('[data-drawing-part="modern"]').toggleAttribute('hidden', !selected.model.chimney);
    find('[data-roof="modern"]').toggleAttribute('hidden', selected.product === 'classic');
    find('[data-roof="classic"]').toggleAttribute('hidden', selected.product !== 'classic');
    updateDrawingDimensions(root, selected.product);
    find('[data-drawing]').setAttribute(
      'aria-label',
      `Схема ${selected.model.name}, основание ${valid ? `${selected.length} на ${selected.width} миллиметров` : 'уточните размеры'}`,
    );
    if (!error.hidden) {
      error.textContent = validateSelection(selected);
      error.hidden = !error.textContent;
    }
    if (previous !== selected.model.name)
      root.dispatchEvent(new CustomEvent('productchange', { bubbles: true }));
  };
  const openRequest = (trigger) => {
    const selected = selection();
    error.textContent = validateSelection(selected);
    error.hidden = !error.textContent;
    if (!error.hidden) {
      [...form.elements].filter(element => element.tagName === 'INPUT')
        .find((input) => !input.checkValidity())
        ?.focus();
      return;
    }
    const dialog = document.getElementById(root.dataset.requestTarget);
    if (dialog) initRequest(dialog).open(selected, trigger);
  };
  root.addEventListener('input', update);
  root.addEventListener('change', update);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    openRequest(event.submitter || document.activeElement);
  });
  sizes.addEventListener('click', (event)=>{
    const button = event.target.closest('[data-quantity]');
    if (!button) return;
    const row = button.closest('[data-size-row]');
      const quantity = row.querySelector('[name="quantity"]');
      quantity.value = Math.max(1,Math.min(999,(Number(quantity.value)||1)+Number(button.dataset.quantity)));
    update();
  });
  removeSize.addEventListener('click', ()=>{
    if (sizes.children.length <= 1) return;
    sizes.lastElementChild.remove();
    refreshRows(); update();
    if (removeSize.hidden) addSize.focus();
  });
  addSize.addEventListener('click', ()=>{
    if (sizes.children.length >= 20) return;
    const row = sizes.firstElementChild.cloneNode(true);
    const quantity = row.querySelector('[name="quantity"]');
    quantity.value = '1'; quantity.id = `calculator-quantity-${++rowId}`;
    row.querySelector('label[for]').htmlFor = quantity.id;
    sizes.append(row); refreshRows(); update(); row.querySelector('input').focus();
  });
  refreshRows();
  root.addEventListener('selectproduct', (event) => {
    const radio = [...form.querySelectorAll('input[name="product"]')].find(
      (input) => input.value === event.detail.product,
    );
    if (!radio) return;
    radio.checked = true;
    update();
    root.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start',
    });
    radio.focus({ preventScroll: true });
  });
  update();
  calculatorInstances.add(root);
}
