// Модели изделий и параметры запроса
const models = Object.freeze({
  flat60: { name: 'ФЛЭТ 60', purpose: 'Колпак на столб забора', chimney: false },
  flat80: { name: 'ФЛЭТ 80', purpose: 'Колпак на столб забора', chimney: false },
  modern: { name: 'МОДЕРН', purpose: 'Колпак на дымоход', chimney: true },
  classic: { name: 'КЛАССИК МОДЕРН', purpose: 'Колпак на дымоход', chimney: true },
});

export function selectionFrom(values) {
  const product = Object.hasOwn(models, values.get('product')) ? values.get('product') : 'flat60';
  const options = [];
  if (values.has('mesh') && models[product].chimney) options.push('Защитная сетка');
  const color = values.get('color') === 'other' ? String(values.get('customColor') || '').trim() : String(values.get('color') || 'RAL 7016');
  const finish = values.get('finish') === 'gloss' ? 'Глянцевое' : 'Матовое';
  options.push(color, `${finish} покрытие`);
  const widths = values.getAll('width');
  const quantities = values.getAll('quantity');
  const items = values.getAll('length').map((length, i) => ({ length: Number(length), width: Number(widths[i]), quantity: Number(quantities[i]) }));
  return {
    product,
    model: models[product],
    length: Number(values.get('length')),
    width: Number(values.get('width')),
    quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    items, color, finish,
    options,
  };
}

export function validateSelection(selection) {
  const items = selection.items || [selection];
  if (!items.length || items.length > 20) return 'Добавьте от 1 до 20 вариантов размеров.';
  for (const { length, width, quantity } of items) {
  if (
    ![length, width].every((value) => Number.isInteger(value) && value >= 100 && value <= 3000)
  ) {
    return 'Укажите длину и ширину целыми числами от 100 до 3000 мм. Для других размеров свяжитесь с менеджером.';
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999)
    return 'Укажите количество от 1 до 999 штук.';
  }
  if (!selection.color || selection.color.length > 100) return 'Укажите цвет (до 100 символов).';
  return '';
}

export function summaryText(selection) {
  const { model, length, width, quantity, options } = selection;
  const sizes = (selection.items || [{length,width,quantity}]).map((item,i)=>`${i+1}. ${item.length} × ${item.width} мм — ${item.quantity} шт.`).join('\n');
  return `${model.name}\n${model.purpose}\n${sizes}\nВсего: ${quantity} шт.\nКомплектация: ${options.filter(Boolean).join(', ')}`;
}

