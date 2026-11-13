import React, { useMemo, useState } from 'react';
import { BrainCircuit, X, Search, AlertTriangle, TrendingUp, Info } from 'lucide-react';

const money = n => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const validNumber = v => v !== null && v !== undefined && String(v).trim() !== '' && Number.isFinite(Number(v));

export default function PriceIntelligence({ products = [], onClose }) {
  const [target, setTarget] = useState('35');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('todas');
  const [filter, setFilter] = useState('todos');
  const desired = Number(target);
  const validTarget = target.trim() !== '' && Number.isFinite(desired) && desired >= 0 && desired < 100;
  const categories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].sort(), [products]);
  const analyzed = useMemo(() => products.map(p => {
    const costValid = validNumber(p.cost) && Number(p.cost) >= 0;
    const priceValid = validNumber(p.price) && Number(p.price) > 0;
    const cost = costValid ? Number(p.cost) : null;
    const price = priceValid ? Number(p.price) : null;
    const margin = cost !== null && price !== null ? (price - cost) / price * 100 : null;
    const suggested = cost !== null && validTarget ? cost / (1 - desired / 100) : null;
    const diff = suggested !== null && price !== null ? suggested - price : null;
    const status = margin === null ? 'incompleto' : margin < 0 ? 'prejuizo' : validTarget && margin + 0.000001 < desired ? 'abaixo' : 'adequado';
    return { ...p, cost, price, margin, suggested, diff, status };
  }), [products, desired, validTarget]);
  const visible = useMemo(() => analyzed.filter(p => (category === 'todas' || p.category === category) && (filter === 'todos' || p.status === filter) && `${p.name || ''} ${p.code || ''} ${p.category || ''}`.toLowerCase().includes(search.toLowerCase())).sort((a,b) => ({prejuizo:0,abaixo:1,incompleto:2,adequado:3}[a.status] - {prejuizo:0,abaixo:1,incompleto:2,adequado:3}[b.status])), [analyzed, category, filter, search]);
  const count = s => analyzed.filter(p => p.status === s).length;
  const inputClass = 'w-full min-w-0 bg-black border border-neutral-700 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500 text-sm';
  return <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-2 sm:p-4 no-print" onMouseDown={e => { if(e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label="Análise Inteligente de Preços" className="w-full max-w-5xl max-h-[94vh] overflow-y-auto bg-neutral-900 border border-neutral-700 rounded-2xl p-4 sm:p-6 text-white shadow-2xl">
      <div className="flex items-start justify-between gap-3 mb-3"><div><h2 className="text-lg sm:text-xl font-bold flex items-center gap-2"><BrainCircuit size={22} className="text-amber-500"/> Análise Inteligente de Preços</h2><p className="text-xs text-gray-400 mt-1">Recomendações calculadas sobre o preço de venda. Nenhum dado é alterado.</p></div><button onClick={onClose} aria-label="Fechar análise" className="p-2 rounded-lg hover:bg-neutral-800"><X size={20}/></button></div>
      <div className="bg-black/40 border border-neutral-800 rounded-xl p-3 sm:p-4 mb-4"><label className="text-sm text-gray-300 font-medium">Margem desejada para esta análise (%)<input type="number" min="0" max="99.99" step="0.1" value={target} onChange={e => setTarget(e.target.value)} className={`${inputClass} mt-2 sm:max-w-xs`}/></label><p className="text-xs text-gray-500 mt-2">A meta é temporária e não é salva no Supabase. Preços sugeridos não incluem custos, impostos ou taxas que não estejam no custo cadastrado.</p>{!validTarget && <p className="text-sm text-red-400 mt-2">Informe uma margem entre 0% e menos de 100% para gerar sugestões.</p>}</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">{[['Analisados',analyzed.length,'text-white'],['Prejuízo',count('prejuizo'),'text-red-400'],['Abaixo da meta',validTarget ? count('abaixo') : '—','text-amber-400'],['Dados incompletos',count('incompleto'),'text-gray-300']].map(([label,value,color]) => <div key={label} className="rounded-xl bg-black/50 border border-neutral-800 p-3"><p className="text-xs text-gray-400">{label}</p><p className={`text-xl sm:text-2xl font-bold mt-1 ${color}`}>{value}</p></div>)}</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4"><label className="relative"><Search size={16} className="absolute left-3 top-3 text-gray-500"/><input aria-label="Buscar produto" placeholder="Buscar produto ou código" value={search} onChange={e => setSearch(e.target.value)} className={`${inputClass} pl-9`}/></label><select aria-label="Filtrar categoria" className={inputClass} value={category} onChange={e => setCategory(e.target.value)}><option value="todas">Todas as categorias</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select><select aria-label="Filtrar situação" className={inputClass} value={filter} onChange={e => setFilter(e.target.value)}><option value="todos">Todas as situações</option><option value="prejuizo">Prejuízo</option><option value="abaixo">Abaixo da meta</option><option value="adequado">Dentro da meta</option><option value="incompleto">Dados incompletos</option></select></div>
      <p className="text-xs text-gray-400 mb-3">Exibindo {visible.length} de {analyzed.length} produtos. A sugestão é matemática, não uma previsão de demanda ou preço de mercado.</p>
      <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">{visible.length === 0 && <p className="text-sm text-gray-400 text-center p-6">Nenhum produto encontrado.</p>}{visible.map((p,i) => <div key={p.id ?? i} className="rounded-xl border border-neutral-800 bg-black/40 p-3 sm:p-4"><div className="flex items-start justify-between gap-2 mb-3"><div className="min-w-0"><p className="font-semibold break-words">{p.name || 'Produto sem nome'}</p><p className="text-xs text-gray-500">{p.category || 'Sem categoria'}</p></div><span className={`text-xs px-2 py-1 rounded-md shrink-0 ${p.status === 'prejuizo' ? 'bg-red-500/15 text-red-400' : p.status === 'abaixo' ? 'bg-amber-500/15 text-amber-400' : p.status === 'adequado' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-neutral-700 text-gray-300'}`}>{({prejuizo:'Prejuízo',abaixo:'Abaixo da meta',adequado:'Dentro da meta',incompleto:'Dados incompletos'})[p.status]}</span></div><div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">{[['Custo',p.cost === null ? '—' : money(p.cost)],['Preço atual',p.price === null ? '—' : money(p.price)],['Margem atual',p.margin === null ? '—' : `${p.margin.toFixed(2)}%`],['Preço sugerido',p.suggested === null ? '—' : money(p.suggested)],['Diferença/unidade',p.diff === null ? '—' : money(p.diff)]].map(([label,value]) => <div key={label}><p className="text-xs text-gray-500 mb-1">{label}</p><p className="font-semibold break-words">{value}</p></div>)}</div>{p.status === 'incompleto' && <p className="text-xs text-amber-400 mt-3 flex gap-1 items-center"><AlertTriangle size={13}/> Verifique custo e preço de venda cadastrados.</p>}{p.status === 'abaixo' && p.diff > 0 && <p className="text-xs text-gray-400 mt-3 flex gap-1 items-center"><TrendingUp size={13}/> Para atingir a meta, o preço precisaria aumentar {money(p.diff)} por unidade.</p>}</div>)}</div>
      <div className="flex gap-2 items-start mt-4 text-xs text-gray-500"><Info size={15} className="shrink-0"/><span>O cálculo utiliza o campo de preço de venda cadastrado. Caso esteja vazio, a análise sinaliza dados incompletos em vez de presumir um preço. Valores sugeridos são estimativas de margem bruta.</span></div>
    </div>
  </div>;
}
