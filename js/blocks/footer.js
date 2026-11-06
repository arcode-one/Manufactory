// Текущий год в подвале
const yearInstances = new WeakSet();
export function initYear(element) {
  if (yearInstances.has(element)) return;
  element.textContent = String(new Date().getFullYear());
  yearInstances.add(element);
}
