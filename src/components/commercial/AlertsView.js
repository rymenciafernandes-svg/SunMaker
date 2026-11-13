import React, { useMemo, useState } from 'react';
import { Bell, Search, AlertTriangle } from 'lucide-react';
import { analyzeProducts, brl, percent, percentInput } from '@/lib/commerce';
import { Empty, Intro, Note, panel, Stat, Pager, inputClass } from './shared';
const perPage = 30;
export default function AlertsView({ products = [], calculationMode = 'markup' }) {
  const [minStock,setMinStock]=useState('5'); const [target,setTarget]=useState('25');
  const [category,setCategory]=useState('todas'); const [severity,setSeverity]=useState('todos'); const [search,setSearch]=useState(''); const [page,setPage]=useState(1);
  const stockLimit=percentInput(minStock,0,100000000); const targetMargin=percentInput(target,0,99.99);
  const items=useMemo(()=>analyzeProducts(products,calculationMode),[products,calculationMode]);
  const categories=useMemo(()=>[...new Set(items.map(p=>p.category))].sort(),[items]);
  const alerts=useMemo(()=>{
    const out=[];
    for(const p of items){
      if (p.cost===null || !p.valid) out.push({p,type:'incompleto',priority:0,title:'Dados incompletos',detail:'Custo ou preço não calculável. Verifique os dados de margem.'});
      else if (p.profit<0) out.push({p,type:'critico',priority:0,title:'Preço abaixo do custo',detail:`Diferença de ${brl(Math.abs(p.profit))} por unidade.`});
      else if (targetMargin!==null && p.marginPct<targetMargin) out.push({p,type:'margem',priority:1,title:'Margem abaixo da meta',detail:`Margem atual: ${percent(p.marginPct)} • Meta: ${percent(targetMargin)}.`});
      if(stockLimit!==null && p.stock<stockLimit) out.push({p,type:'estoque',priority:2,title:'Estoque baixo',detail:`Quantidade: ${p.stock.toLocaleString('pt-BR')} • Limite definido: ${stockLimit}.`});
    }
    return out.sort((a,b)=>a.priority-b.priority || a.p.name.localeCompare(b.p.name,'pt-BR'));
  },[items,stockLimit,targetMargin]);
  const filtered=useMemo(()=>alerts.filter(a=>(category==='todas'||a.p.category===category)&&(severity==='todos'||a.type===severity)&&`${a.p.name} ${a.p.code}`.toLowerCase().includes(search.toLowerCase())),[alerts,category,severity,search]);
  const visible=filtered.slice((page-1)*perPage,page*perPage);
  const counts={critico:alerts.filter(a=>a.type==='critico').length,incompleto:alerts.filter(a=>a.type==='incompleto').length,margem:alerts.filter(a=>a.type==='margem').length,estoque:alerts.filter(a=>a.type==='estoque').length};
  const change=(setter)=>v=>{setter(v);setPage(1);};
  return <div className={`${panel} space-y-5 no-print`}><Intro icon={Bell} title="Central de Alertas" subtitle="Verificações automáticas, sem notificações externas nem alterações no cadastro."/>
    {items.length===0?<Empty/>:<>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="text-xs text-gray-400">Meta mínima de margem bruta (%)<input type="number" min="0" max="99.99" step="0.1" className={`${inputClass} mt-2`} value={target} onChange={e=>change(setTarget)(e.target.value)}/></label><label className="text-xs text-gray-400">Limite para estoque baixo (unidades)<input type="number" min="0" step="1" className={`${inputClass} mt-2`} value={minStock} onChange={e=>change(setMinStock)(e.target.value)}/></label></div>
      {(stockLimit===null||targetMargin===null)&&<p className="text-xs text-amber-400">Informe uma margem de 0% até 99,99% e um limite de estoque não negativo.</p>}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3"><Stat title="Preço abaixo do custo" value={counts.critico} accent="text-red-400"/><Stat title="Margem abaixo da meta" value={counts.margem} accent="text-amber-400"/><Stat title="Estoque baixo" value={counts.estoque} accent="text-amber-400"/><Stat title="Dados incompletos" value={counts.incompleto} accent="text-gray-300"/></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2"><label className="relative"><Search size={16} className="absolute left-3 top-3 text-gray-500"/><input aria-label="Pesquisar alertas" className={`${inputClass} pl-9`} placeholder="Produto ou código" value={search} onChange={e=>change(setSearch)(e.target.value)}/></label><select aria-label="Categoria" className={inputClass} value={category} onChange={e=>change(setCategory)(e.target.value)}><option value="todas">Todas as categorias</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select><select aria-label="Situação" className={inputClass} value={severity} onChange={e=>change(setSeverity)(e.target.value)}><option value="todos">Todos os alertas</option><option value="critico">Preço abaixo do custo</option><option value="margem">Margem abaixo da meta</option><option value="estoque">Estoque baixo</option><option value="incompleto">Dados incompletos</option></select></div>
      <p className="text-xs text-gray-400">{filtered.length} alertas encontrados. Um produto pode gerar mais de um alerta.</p>
      {visible.length===0?<Empty label="Nenhum alerta corresponde aos filtros."/>:<div className="space-y-2">{visible.map((a,i)=><div key={`${a.p.id}-${a.type}-${i}`} className="bg-black/40 border border-neutral-800 rounded-xl p-4 flex items-start gap-3"><AlertTriangle size={19} className={a.type==='critico'?'text-red-400':'text-amber-400'}/><div className="min-w-0 flex-1"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold text-sm break-words">{a.p.name}</h3><span className={`text-xs ${a.type==='critico'?'text-red-400':a.type==='incompleto'?'text-gray-400':'text-amber-400'}`}>{a.title}</span></div><p className="text-xs text-gray-400 mt-1">{a.p.category} • {a.detail}</p></div></div>)}</div>}
      <Pager total={filtered.length} page={page} setPage={setPage} pageSize={perPage}/><Note>Alertas calculados durante a visualização. As metas são temporárias e não ficam salvas no Supabase.</Note>
    </>}
  </div>;
}
