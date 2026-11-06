// Custom select UI; native controls remain the source of submitted values.
export function initCalculatorSelects(root) {
  let closeCurrent = null;
  root.querySelectorAll('.calculator__finishes select').forEach(select => {
    const label = select.parentElement;
    const field = document.createElement('div');
    field.className = label.className;
    const caption = document.createElement('span');
    caption.id = 'calculator-label-' + select.name;
    caption.textContent = label.firstChild.textContent.trim();
    const wrapper = document.createElement('div');
    wrapper.className = 'calculator-select';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'calculator-select__trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-labelledby', caption.id);
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const value = document.createElement('span');
    trigger.append(value);
    const list = document.createElement('div');
    list.id = 'calculator-options-' + select.name;
    list.className = 'calculator-select__list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-labelledby', caption.id);
    list.hidden = true;
    list.addEventListener('pointerdown', event => event.preventDefault());
    trigger.setAttribute('aria-controls', list.id);
    const options = Array.from(select.options);
    let active = select.selectedIndex;
    const entries = options.map((option, index) => {
      const entry = document.createElement('div');
      entry.id = list.id + '-' + index;
      entry.className = 'calculator-select__option';
      entry.setAttribute('role', 'option');
      entry.textContent = option.textContent;
      entry.addEventListener('click', () => choose(index));
      list.append(entry);
      return entry;
    });
    const sync = () => {
      value.textContent = options[select.selectedIndex].textContent;
      entries.forEach((entry, index) => entry.setAttribute('aria-selected', String(index === select.selectedIndex)));
    };
    const highlight = () => {
      entries.forEach((entry, index) => entry.classList.toggle('is-active', index === active));
      trigger.setAttribute('aria-activedescendant', entries[active].id);
      entries[active].scrollIntoView({ block: 'nearest' });
    };
    const close = () => {
      list.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      wrapper.classList.remove('is-open');
      if (closeCurrent === close) closeCurrent = null;
    };
    const open = () => {
      closeCurrent?.();
      closeCurrent = close;
      active = select.selectedIndex;
      list.hidden = false;
      wrapper.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      highlight();
    };
    function choose(index) {
      select.value = options[index].value;
      sync();
      close();
      select.dispatchEvent(new Event('change', { bubbles: true }));
      trigger.focus({ preventScroll: true });
    }
    trigger.addEventListener('click', () => list.hidden ? open() : close());
    let search = '', searchTime = 0;
    trigger.addEventListener('keydown', event => {
      if (event.key === 'Escape' || event.key === 'Tab') { close(); return; }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        if (list.hidden) open();
        else {
          active = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : Math.max(0, Math.min(options.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1)));
          highlight();
        }
      } else if ((event.key === 'Enter' || event.key === ' ') && !list.hidden) {
        event.preventDefault(); choose(active);
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && event.key !== ' ') {
        event.preventDefault();
        if (list.hidden) open();
        search = Date.now() - searchTime > 700 ? event.key : search + event.key;
        searchTime = Date.now();
        const index = options.findIndex(option => option.textContent.toLowerCase().startsWith(search.toLowerCase()));
        if (index >= 0) { active = index; highlight(); }
      }
    });
    wrapper.addEventListener('focusout', event => { if (!wrapper.contains(event.relatedTarget)) close(); });
    select.addEventListener('change', sync);
    select.hidden = true;
    label.replaceWith(field);
    wrapper.append(select, trigger, list);
    field.append(caption, wrapper);
    sync();
  });
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.calculator-select')) closeCurrent?.();
  });
  window.addEventListener('resize', () => closeCurrent?.());
}
