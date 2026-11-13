import React, { useMemo, useState } from 'react';
import { GitCompare, Search } from 'lucide-react';
import { analyzeProducts, brl, percent } from '@/lib/commerce';
import { Intro, Empty, Note, panel, inputClass } from './shared';
export default function ProductCompareView({ products = [], calculationMode = 'markup' }) {
  const [ids,setIds]=useState(['','','']); const [search,setSearch]=useState('');
  const items=useMemo(()=>analyzeProducts(products,calculationMode),[products,calculationMode]);
  const sorted=useMemo(()=>items.filter(p=>`${p.name} ${p.code}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).slice(0,100),[items,search]);
  const selected=ids.map(id=>items.find(p=>String(p.id)===id)).filter(Boolean);
  const fields=[['Categoria',p=>p.category],['Custo unitário',p=>p.cost===null?'—':brl(p.cost)],['Preço estimado',p=>p.price===null?'—':brl(p.price)],['Lucro bruto unitário',p=>p.profit===null?'—':brl(p.profit)],['Margem bruta',p=>percent(p.marginPct)],['Markup',p=>percent(p.markupPct)],['Estoque',p=>p.stock.toLocaleString('pt-BR')],['Capital investido no estoque',p=>brl(p.stockCost)],['Lucro bruto potencial do estoque',p=>p.valid?brl(p.stockProfit):'—']];
  return <div className={`${panel} space-y-5 no-print`}><Intro icon={GitCompare} title="Comparador de Produtos" subtitle="Compare até três produtos da empresa ativa, lado a lado, sem alterar dados."/>
    {items.length===0?<Empty/>:<><label className="relative block"><Search size={16} className="absolute left-3 top-3 text-gray-500"/><input className={`${inputClass} pl-9`} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filtrar a lista de produtos para selecionar"/></label><div className="grid grid-cols-1 lg:grid-cols-3 gap-3">{ids.map((id,i)=><label key={i} className="text-xs text-gray-400">Produto {i+1}<select className={`${inputClass} mt-2`} value={id} onChange={e=>setIds(prev=>prev.map((value,j)=>j===i?e.target.value:value))}><option value="">Selecione um produto</option>{items.filter(p=>ids.includes(String(p.id))&&String(p.id)===id).concat(sorted.filter(p=>!ids.includes(String(p.id)))).map(p=><option key={p.id} value={String(p.id)}>{p.name}</option>)}</select></label>)}</div>
      {selected.length<2?<Empty label="Selecione pelo menos dois produtos para comparar."/>:<div className="overflow-x-auto rounded-xl border border-neutral-800"><table className="w-full min-w-[600px] text-sm"><thead className="bg-black"><tr><th className="text-left py-3 px-4 text-gray-400">Indicador</th>{ids.map((id,i)=>{const p=items.find(p=>String(p.id)===id);return p?<th key={i} className="text-left py-3 px-4 max-w-[220px] break-words text-amber-400">{p.name}</th>:null})}</tr></thead><tbody>{fields.map(([name,get])=><tr key={name} className="border-t border-neutral-800"><td className="py-3 px-4 text-gray-400">{name}</td>{selected.map((p,i)=><td key={String(p.id)+i} className="py-3 px-4 font-semibold">{get(p)}</td>)}</tr>)}</tbody></table></div>}
      <Note>Preços são derivados da margem cadastrada e do modo do relatório quando não existe preço explícito. Lucro em estoque é potencial, não lucro realizado.</Note>
    </>}
  </div>;
}
