import { calculateProduct, numberOk } from './commerce.js';

export const keyForProduct = p => {
  const name = String(p.name || '').trim();
  const code = String(p.code || name.match(/^(\d+)\s*-\s*/)?.[1] || '').trim();
  return code ? `code:${code}` : `name:${name.toLocaleLowerCase('pt-BR')}|${String(p.category || '').trim().toLocaleLowerCase('pt-BR')}`;
};
export const nonnegative = v => numberOk(v) && Number(v) >= 0 ? Number(v) : null;
export const total = (rows, field) => rows.reduce((sum, row) => sum + (Number.isFinite(row[field]) ? row[field] : 0), 0);
export function abc(rows, metric) {
  const sorted = rows.map(p => ({ ...p, value: Math.max(0, p[metric] || 0) })).sort((a,b) => b.value-a.value);
  const sum = total(sorted, 'value');
  let cumulative = 0;
  return sorted.map(p => {
    const before = sum ? cumulative/sum*100 : 0;
    cumulative += p.value;
    return { ...p, share: sum ? p.value/sum*100 : 0, cumulative: sum ? cumulative/sum*100 : 0, grade: p.value === 0 ? 'C' : before < 80 ? 'A' : before < 95 ? 'B' : 'C' };
  });
}
export function fullPrice(cost, freight, extra, tax, fee, discount, target) {
  const values = [cost,freight,extra,tax,fee,discount,target].map(nonnegative);
  if (values.some(v => v === null)) return null;
  const [c,f,e,t,a,d,m] = values;
  if (d>=100 || t+a+m>=100) return null;
  const fixed = c+f+e;
  const received = fixed/(1-(t+a+m)/100);
  const listPrice = Math.ceil((received/(1-d/100))*100 - 1e-8)/100;
  if (!Number.isFinite(listPrice)) return null;
  const netSale = listPrice*(1-d/100);
  const variable = netSale*(t+a)/100;
  const profit = netSale-fixed-variable;
  return {fixed,listPrice,netSale,variable,profit,margin:netSale>0?profit/netSale*100:null};
}
export function snapshot(products, mode, label) {
  return {id: `${Date.now()}-${Math.random().toString(36).slice(2,9)}`, date: new Date().toISOString(), label: String(label || 'Relatório').slice(0,120), mode, rows: products.map(p => { const v=calculateProduct(p,mode); return {key:keyForProduct(p), name:v.name, category:v.category, cost:v.cost, stock:v.stock, price:v.price, marginPct:v.marginPct}; })};
}
export function compareSnapshots(a,b) {
  const index = rows => { const map=new Map(); for(const p of rows){ const list=map.get(p.key)||[];list.push(p);map.set(p.key,list); } return map; };
  const before=index(a.rows), after=index(b.rows);
  return [...new Set([...before.keys(),...after.keys()])].map(key=>{
    const l=before.get(key)||[], r=after.get(key)||[];
    if(l.length>1||r.length>1) return {key,name:(r[0]||l[0]).name,status:'Duplicado / ambíguo',before:null,after:null};
    const x=l[0]||null,y=r[0]||null;
    const changed=x&&y&&['cost','stock','price','marginPct'].some(f=>x[f]!==y[f]);
    return {key,name:(y||x).name,before:x,after:y,status:!x?'Novo':!y?'Ausente':changed?'Alterado':'Igual'};
  });
}
export function readLocal(company, section, fallback) {
  if(!company || company==='sunmaker-master' || typeof window==='undefined') return fallback;
  const raw=window.localStorage.getItem(`sunmaker_planning_v1:${encodeURIComponent(company)}:${section}`);
  return raw ? JSON.parse(raw) : fallback;
}
export function writeLocal(company, section, value) {
  if(!company || company==='sunmaker-master' || typeof window==='undefined') throw new Error('Selecione uma empresa.');
  window.localStorage.setItem(`sunmaker_planning_v1:${encodeURIComponent(company)}:${section}`,JSON.stringify(value));
}
export function saveSnapshot(company, item) {
  const list=readLocal(company,'snapshots',[]);
  if(list.length>=10) throw new Error('Limite de 10 relatórios locais. Exclua um relatório antigo para salvar outro.');
  const next=[item,...list]; writeLocal(company,'snapshots',next); return next;
}
