// Histórico local e incremental. Não é auditoria central, não grava no Supabase.
const prefix = 'sunmaker_price_history_v1_';
const key = companyId => `${prefix}${String(companyId || 'none')}`;
export function getLocalPriceHistory(companyId) {
  if (typeof window === 'undefined' || !companyId || companyId === 'sunmaker-master') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key(companyId)) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
export function recordLocalPriceChange(companyId, event) {
  if (typeof window === 'undefined' || !companyId || companyId === 'sunmaker-master') return;
  try {
    const entries = getLocalPriceHistory(companyId);
    const newEntry = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      time: new Date().toISOString(),
    };
    window.localStorage.setItem(key(companyId), JSON.stringify([newEntry, ...entries].slice(0, 300)));
  } catch (err) { console.warn('Histórico local indisponível:', err); }
}
export function clearLocalPriceHistory(companyId) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(key(companyId)); } catch {}
}
