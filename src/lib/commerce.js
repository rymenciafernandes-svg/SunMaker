// Funções puras: respeitam o mesmo modo markup/margem real do Dashboard.
export const brl = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const numberOk = value => value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value));
export function calculateProduct(product, mode = 'markup') {
  const cost = numberOk(product?.cost) && Number(product.cost) >= 0 ? Number(product.cost) : null;
  const stock = numberOk(product?.stock) && Number(product.stock) >= 0 ? Number(product.stock) : 0;
  const rawMargin = numberOk(product?.margin) ? Number(product.margin) : null;
  // O Dashboard não utiliza uma coluna de preço obrigatória; deriva o preço pela margem.
  const derived = cost !== null && rawMargin !== null && rawMargin >= 0
    ? mode === 'markup' || rawMargin >= 100
      ? cost * (1 + rawMargin / 100)
      : cost / (1 - rawMargin / 100)
    : null;
  const explicit = numberOk(product?.price) && Number(product.price) > 0 ? Number(product.price) : null;
  const price = explicit ?? derived;
  const valid = cost !== null && Number.isFinite(price) && price > 0;
  const profit = valid ? price - cost : null;
  const marginPct = valid ? profit / price * 100 : null;
  return {
    id: product?.id, code: product?.code || '', name: product?.name || 'Produto sem nome',
    category: product?.category || 'Sem categoria', stock, cost, price: valid ? price : null,
    profit, marginPct, markupPct: cost > 0 && valid ? profit / cost * 100 : null,
    stockCost: cost === null ? 0 : cost * stock,
    stockRevenue: valid ? price * stock : 0,
    stockProfit: valid ? profit * stock : 0,
    valid, rawMargin,
  };
}
export const analyzeProducts = (products, mode) => (products || []).map(p => calculateProduct(p, mode));
export function percentInput(value, min = 0, max = 99.99) {
  if (String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
export const percent = value => value === null || !Number.isFinite(value) ? '—' : `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
