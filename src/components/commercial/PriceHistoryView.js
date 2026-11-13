import React, { useEffect, useState } from 'react';
import { History, RotateCcw, Trash2 } from 'lucide-react';
import { brl, percent } from '@/lib/commerce';
import { getLocalPriceHistory, clearLocalPriceHistory } from '@/lib/localPriceHistory';
import { Empty, Intro, Note, panel, Pager, inputClass } from './shared';
const perPage=30;
export default function PriceHistoryView({ companyId, companyName }) {
  const [entries,setEntries]=useState([]); const [search,setSearch]=useState(''); const [page,setPage]=useState(1);
  const refresh=()=>{setEntries(getLocalPriceHistory(companyId));setPage(1);};
  useEffect(()=>{setEntries(getLocalPriceHistory(companyId));setPage(1);},[companyId]);
  const filtered=entries.filter(e=>`${e.name||''} ${e.actor||''} ${e.action||''}`.toLowerCase().includes(search.toLowerCase()));
  const visible=filtered.slice((page-1)*perPage,page*perPage);
  return <div className={`${panel} space-y-5 no-print`}><Intro icon={History} title="Histórico de Preços" subtitle="Alterações feitas neste navegador, a partir da instalação desta atualização."/>
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"><p className="text-sm text-amber-400 font-semibold mb-2">Histórico local — não é uma auditoria do Supabase</p><Note>Os registros ficam somente neste navegador, vinculados à empresa ({companyName || companyId || 'sem empresa'}). Não aparecem em outros dispositivos, podem ser apagados com os dados do navegador e não incluem alterações anteriores, importações nem mudanças feitas em outros computadores. Para histórico central permanente, será necessária uma tabela com políticas de acesso próprias.</Note></div>
    {!companyId || companyId==='sunmaker-master' ? <Empty label="Selecione o ambiente de uma empresa para visualizar seu histórico local."/> : <>
      <div className="flex flex-wrap gap-2 items-center"><input className={`${inputClass} flex-1 min-w-[180px]`} placeholder="Pesquisar produto, usuário ou ação" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/><button onClick={refresh} className="border border-neutral-700 bg-neutral-800 rounded-lg px-3 py-2.5 text-sm flex items-center gap-2"><RotateCcw size={15}/> Atualizar</button><button onClick={()=>{if(window.confirm('Apagar o histórico LOCAL deste navegador para esta empresa?')){clearLocalPriceHistory(companyId);refresh();}}} className="border border-red-900/60 text-red-400 rounded-lg px-3 py-2.5 text-sm flex items-center gap-2"><Trash2 size={15}/> Limpar local</button></div>
      {visible.length===0?<Empty label="Nenhuma alteração local encontrada."/>:<div className="space-y-2">{visible.map(e=><div key={e.id} className="rounded-xl border border-neutral-800 bg-black/40 p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold text-sm">{e.name||'Alteração geral de margem'}</p><time className="text-xs text-gray-500">{new Date(e.time).toLocaleString('pt-BR')}</time></div><p className="text-xs text-gray-400 mt-2">{e.action || 'Alteração'} • {e.actor || 'Usuário não informado'}</p><div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm"><span>Antes: <strong>{e.beforePrice==null ? '—' : brl(e.beforePrice)}</strong></span><span>Depois: <strong className="text-amber-400">{e.afterPrice==null?'—':brl(e.afterPrice)}</strong></span><span>Margem anterior: {percent(e.beforeMargin)}</span><span>Margem nova: {percent(e.afterMargin)}</span></div>{e.notes&&<p className="text-xs text-gray-500 mt-2">{e.notes}</p>}</div>)}</div>}
      <Pager page={page} setPage={setPage} total={filtered.length} pageSize={perPage}/>
    </>}
  </div>;
}
