import React, { useState } from 'react';
import { X, Calculator, RotateCcw } from 'lucide-react';

const money = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const number = (value) => {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

export default function MarginSimulator({ products = [], onClose }) {
  const [mode, setMode] = useState('novo');
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [target, setTarget] = useState('30');
  const c = number(cost);
  const p = number(price);
  const desired = number(target);
  const validTarget = desired < 100;
  const margin = p > 0 ? ((p - c) / p) * 100 : null;
  const profit = p - c;
  const suggested = validTarget ? c / (1 - desired / 100) : null;

  const selectProduct = (id) => {
    setSelectedId(id);
    const product = products.find(item => String(item.id) === id);
    setName(product?.name || '');
    setCost(product?.cost != null ? String(product.cost) : '');
    if (product) {
      const m = number(product.margin);
      const base = number(product.cost);
      // Mantém a mesma convenção de cálculo configurada no dashboard apenas como referência.
      setPrice(product.price != null && Number(product.price) > 0 ? String(product.price) : (m > 0 ? String(base * (1 + m / 100)) : ''));
    } else setPrice('');
  };
  const reset = () => { setSelectedId(''); setName(''); setCost(''); setPrice(''); setTarget('30'); };
  const fieldClass = 'w-full bg-black border border-neutral-700 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500';
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 no-print" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Simulador de Margens" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-neutral-900 border border-neutral-700 rounded-2xl p-5 sm:p-7 shadow-2xl">
        <div className="flex items-center justify-between gap-3 mb-5"><h2 className="text-xl font-bold flex items-center gap-2"><Calculator className="text-amber-500"/> Simulador de Margens</h2><button onClick={onClose} aria-label="Fechar simulador" className="p-2 hover:bg-neutral-800 rounded-lg"><X size={20}/></button></div>
        <p className="text-xs text-gray-400 mb-5">Simulação independente: nenhum dado será gravado ou alterado no Supabase. Margem calculada sobre o preço de venda.</p>
        <div className="flex gap-2 mb-5"><button onClick={() => { setMode('novo'); reset(); }} className={`px-3 py-2 rounded-lg text-sm font-semibold ${mode === 'novo' ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-gray-300'}`}>Produto novo</button><button onClick={() => { setMode('cadastrado'); reset(); }} className={`px-3 py-2 rounded-lg text-sm font-semibold ${mode === 'cadastrado' ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-gray-300'}`}>Produto cadastrado</button></div>
        {mode === 'cadastrado' && <label className="block mb-4 text-sm text-gray-300">Selecionar produto<select value={selectedId} onChange={e => selectProduct(e.target.value)} className={`${fieldClass} mt-1`}><option value="">Escolha um produto...</option>{products.map(item => <option key={item.id} value={String(item.id)}>{item.name}</option>)}</select></label>}
        {mode === 'novo' && <label className="block mb-4 text-sm text-gray-300">Nome do produto (opcional)<input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Produto de teste" className={`${fieldClass} mt-1`}/></label>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4"><label className="text-sm text-gray-300">Custo unitário (R$)<input type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} className={`${fieldClass} mt-1`}/></label><label className="text-sm text-gray-300">Preço de venda simulado (R$)<input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className={`${fieldClass} mt-1`}/></label></div>
        <label className="block text-sm text-gray-300 mb-5">Margem desejada (%)<input type="number" min="0" max="99.99" step="0.1" value={target} onChange={e => setTarget(e.target.value)} className={`${fieldClass} mt-1`}/></label>
        {!validTarget && <p className="text-red-400 text-sm mb-3">Informe uma margem desejada menor que 100%.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="bg-black/50 border border-neutral-800 rounded-xl p-4"><p className="text-xs text-gray-400 uppercase">Margem simulada</p><p className={`text-2xl font-bold mt-1 ${margin != null && margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{margin == null ? '—' : `${margin.toFixed(2)}%`}</p></div><div className="bg-black/50 border border-neutral-800 rounded-xl p-4"><p className="text-xs text-gray-400 uppercase">Lucro por unidade</p><p className={`text-2xl font-bold mt-1 ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{cost === '' || price === '' ? '—' : money(profit)}</p></div><div className="sm:col-span-2 bg-black/50 border border-amber-500/30 rounded-xl p-4"><p className="text-xs text-gray-400 uppercase">Preço sugerido para a margem desejada</p><p className="text-2xl font-bold text-amber-400 mt-1">{cost === '' || suggested == null ? '—' : money(suggested)}</p><p className="text-xs text-gray-500 mt-1">Não inclui impostos, frete, taxas ou despesas adicionais não informadas no custo.</p></div></div>
        <div className="flex justify-end mt-5"><button onClick={reset} className="flex items-center gap-2 text-sm bg-neutral-800 hover:bg-neutral-700 rounded-lg px-4 py-2"><RotateCcw size={15}/> Limpar simulação</button></div>
      </div>
    </div>
  );
}
