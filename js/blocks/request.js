import { createDialog } from '../utils/dialog.js';
import { summaryText, validateSelection } from './calculator-model.js';

const requestInstances = new WeakMap();

export function initRequest(root) {
  if (requestInstances.has(root)) return requestInstances.get(root);
  const dialog = createDialog(root);
  const form = root.querySelector('[data-request-form]');
  const button = root.querySelector('[data-request-submit]');
  const status = root.querySelector('[data-request-status]');
  const success = root.querySelector('[data-request-success]');
  const spec = root.querySelector('[data-request-spec]');
  // WordPress передаст адрес обработчика при интеграции формы.
  const localPreview = ['localhost', '127.0.0.1'].includes(location.hostname) && location.port === '4173';
  const endpoint = localPreview ? '' : form.dataset.requestEndpoint;
  let selection = null;
  let pending = false;
  let tokenRequest;
  let requestId;
  const token = () => {
    if (!tokenRequest) {
      tokenRequest = fetch(endpoint, { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10000) })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok || !data.token) throw new Error('Token unavailable');
          return data.token;
        })
        .catch((error) => { tokenRequest = null; throw error; });
    }
    return tokenRequest;
  };
  const message = (text) => {
    status.textContent = text;
    status.hidden = !text;
  };
  form.elements.phone.addEventListener('input', () => form.elements.phone.setCustomValidity(''));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending) return;
    const phone = form.elements.phone.value.replace(/\D/g, '');
    form.elements.phone.setCustomValidity(phone.length >= 10 && phone.length <= 15 ? '' : 'Укажите телефон с кодом города или страны.');
    if (!form.reportValidity()) return;
    if (selection && validateSelection(selection)) return message(validateSelection(selection));
    if (!endpoint) return message('Сейчас отправка недоступна. Пожалуйста, свяжитесь с нами по телефону.');
    pending = true;
    button.disabled = true;
    button.textContent = 'Отправляем…';
    form.setAttribute('aria-busy', 'true');
    message('');
    try {
      const csrf = await token();
      const values = new FormData(form);
      const response = await fetch(endpoint, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          token: csrf, requestId,
          name: values.get('name'), phone: values.get('phone'), comment: values.get('comment'),
          website: values.get('website'), consent: values.has('consent'),
          selection: selection ? {
            product: selection.product, length: selection.length, width: selection.width,
            quantity: selection.quantity, mesh: selection.options.includes('Защитная сетка'),
            items: selection.items.map(item => ({...item})),
            color: selection.color, finish: selection.finish,
          } : null,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        if (response.status === 403) tokenRequest = null;
        throw new Error(data.message || 'Не удалось отправить заявку. Попробуйте позже или позвоните нам.');
      }
      form.reset();
      form.hidden = true;
      success.hidden = false;
      spec.hidden = true;
      root.querySelector('.request__copy').hidden = true;
      success.focus({ preventScroll: true });
    } catch (error) {
      message(error.name === 'TimeoutError'
        ? 'Не удалось подтвердить отправку. Свяжитесь с нами по телефону, чтобы уточнить статус заявки.'
        : error instanceof SyntaxError || error instanceof TypeError || error.message === 'Token unavailable'
          ? 'Не удалось отправить заявку. Попробуйте позже или позвоните нам.' : error.message);
    } finally {
      pending = false;
      button.disabled = false;
      button.textContent = 'Отправить заявку';
      form.removeAttribute('aria-busy');
    }
  });
  const api = {
    open(next = null, trigger) {
      if (!pending) {
        selection = next ? { ...next, options: [...next.options], items: next.items.map(item=>({...item})) } : null;
        requestId = crypto.randomUUID();
        spec.textContent = next ? summaryText(next) : '';
        spec.hidden = !next;
        form.hidden = false;
        success.hidden = true;
        root.querySelector('.request__copy').hidden = false;
        message('');
        if (endpoint) token().catch(() => {});
      }
      dialog.open(trigger);
      root.scrollTop = 0;
    },
  };
  document.querySelectorAll('[data-open-request]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const origin = trigger.closest('[data-menu]')
        ? document.querySelector('[data-menu-toggle]')
        : trigger;
      api.open(null, origin);
    });
  });
  requestInstances.set(root, api);
  return api;
}
