import React, { useMemo, useState } from 'react';
import { Sliders, Search, FileSpreadsheet } from 'lucide-react';
import { analyzeProducts, brl, percent, percentInput } from '@/lib/commerce';
import { exportXlsx } from '@/lib/exportCommerce';
import { Intro, Empty, Note, panel, inputClass, Pager, Stat } from './shared';
const perPage=40;
export default function BulkRepriceView({ products = [], calculationMode = 'markup' }) {
  const [category,setCategory]=useState('todas'); const [delta,setDelta]=useState('5'); const [search,setSearch]=useState(''); const [page,setPage]=useState(1);
  const items=useMemo(()=>analyzeProducts(products,calculationMode),[products,calculationMode]);
  const categories=useMemo(()=>[...new Set(items.map(p=>p.category))].sort(),[items]);
  const rate=percentInput(delta,-99,500); const factor=rate===null?null:1+rate/100;
  const selected=useMemo(()=>items.filter(p=>(category==='todas'||p.category===category)&&`${p.name} ${p.code}`.toLowerCase().includes(search.toLowerCase())),[items,category,search]);
  const analysis=useMemo(()=>selected.map(p=>({ ...p, simulated: p.valid&&factor!==null ? p.price*factor : null,simulatedMargin: p.valid&&factor!==null&&p.price*factor>0 ? (p.price*factor-p.cost)/(p.price*factor)*100 : null,simulatedProfit: p.valid&&factor!==null ? (p.price*factor-p.cost)*p.stock : null })),[selected,factor]);
  const calculated=analysis.filter(p=>p.simulated!==null);
  const oldProfit=calculated.reduce((s,p)=>s+p.stockProfit,0);
  const newProfit=calculated.reduce((s,p)=>s+p.simulatedProfit,0);
  const exportRows=analysis.map(p=>[p.code,p.name,p.category,p.stock,p.cost??'',p.price??'',p.simulated??'',p.marginPct??'',p.simulatedMargin??'',p.simulatedProfit??'']);
  const change=setter=>value=>{setter(value);setPage(1);};
  return <div className={`${panel} space-y-5 no-print`}><Intro icon={Sliders} title="Simulador de Reajuste em Massa" subtitle="Simule o aumento ou a redução de preços por categoria, sem gravar nada no Supabase."/>
    {items.length===0?<Empty/>:<>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><label className="text-xs text-gray-400">Reajuste simulado (%)<input type="number" step="0.1" min="-99" max="500" value={delta} onChange={e=>change(setDelta)(e.target.value)} className={`${inputClass} mt-2`}/></label><label className="text-xs text-gray-400">Categoria<select className={`${inputClass} mt-2`} value={category} onChange={e=>change(setCategory)(e.target.value)}><option value="todas">Todas as categorias</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></label><label className="text-xs text-gray-400">Buscar produto<input className={`${inputClass} mt-2`} value={search} onChange={e=>change(setSearch)(e.target.value)} placeholder="Nome ou código"/></label></div>
      {rate===null&&<p className="text-xs text-red-400">Informe um reajuste entre -99% e +500%.</p>}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3"><Stat title="Produtos selecionados" value={analysis.length}/><Stat title="Com preço calculável" value={calculated.length}/><Stat title="Lucro potencial antes" value={brl(oldProfit)}/><Stat title="Lucro potencial simulado" value={rate===null?'—':brl(newProfit)} accent={newProfit>=oldProfit?'text-emerald-400':'text-amber-400'}/></div>
      <Note>Esta tela é apenas uma projeção matemática sobre o estoque: aumentar preços não garante manter a mesma quantidade de vendas. {analysis.length-calculated.length} produto(s) sem preço calculável ficaram fora dos totais.</Note>
      <div className="flex justify-end"><button disabled={rate===null} className="px-3 py-2.5 border border-amber-500/40 text-amber-400 rounded-lg flex items-center gap-2 text-sm disabled:opacity-40" onClick={()=>exportXlsx('SunMaker-reajuste-simulado.xlsx',['Código','Produto','Categoria','Estoque','Custo','Preço anterior','Preço simulado','Margem anterior (%)','Margem simulada (%)','Lucro potencial no estoque (R$)'],exportRows)}><FileSpreadsheet size={16}/> Exportar simulação Excel</button></div>
      <div className="overflow-x-auto rounded-xl border border-neutral-800"><table className="w-full min-w-[740px] text-xs sm:text-sm"><thead className="bg-black text-gray-400"><tr>{['Produto','Categoria','Preço atual','Preço simulado','Margem atual','Nova margem'].map(h=><th key={h} className="px-3 py-3 text-left">{h}</th>)}</tr></thead><tbody>{analysis.slice((page-1)*perPage,page*perPage).map((p,i)=><tr key={String(p.id)+i} className="border-t border-neutral-800"><td className="px-3 py-3 font-semibold max-w-[210px] truncate" title={p.name}>{p.name}</td><td className="px-3 py-3 text-gray-400">{p.category}</td><td className="px-3 py-3">{p.price===null?'—':brl(p.price)}</td><td className="px-3 py-3 text-amber-400 font-semibold">{p.simulated===null?'—':brl(p.simulated)}</td><td className="px-3 py-3">{percent(p.marginPct)}</td><td className="px-3 py-3">{percent(p.simulatedMargin)}</td></tr>)}</tbody></table>{analysis.length===0&&<p className="text-sm text-gray-400 p-6">Nenhum produto corresponde aos filtros.</p>}</div><Pager total={analysis.length} page={page} setPage={setPage} pageSize={perPage}/>
    </>}
  </div>;
}
