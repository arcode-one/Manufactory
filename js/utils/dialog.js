// Модальные окна: фокус, Escape, закрытие
const dialogInstances = new WeakMap();
const focusableSelector =
  'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Shared native dialog behavior: focus containment, Escape and reliable focus restoration. */
export function createDialog(element) {
  if (dialogInstances.has(element)) return dialogInstances.get(element);
  let trigger;
  const api = {
    open(origin = document.activeElement) {
      if (element.open) return;
      trigger = origin;
      element.showModal();
    },
    close() {
      if (element.open) element.close();
    },
  };
  element
    .querySelectorAll('[data-dialog-close]')
    .forEach((button) => button.addEventListener('click', api.close));
  element.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusable = [...element.querySelectorAll(focusableSelector)].filter(
      (node) => node.getClientRects().length,
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first) {
      event.preventDefault();
      element.focus();
      return;
    }
    if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === element)
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  element.addEventListener('click', (event) => {
    if (event.target !== element) return;
    const rect = element.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      api.close();
  });
  element.addEventListener('close', () => {
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  });
  dialogInstances.set(element, api);
  return api;
}
