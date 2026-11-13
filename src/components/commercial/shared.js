import React from 'react';
import { Info } from 'lucide-react';
export const inputClass = 'w-full min-w-0 bg-black border border-neutral-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-amber-500';
export const panel = 'bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-6 min-w-0';
export function Intro({ title, subtitle, icon: Icon }) {
  return <div className="flex items-start gap-3 mb-5"><div className="p-2 rounded-xl bg-amber-500/10 text-amber-400"><Icon size={22}/></div><div><h2 className="text-lg sm:text-xl font-bold">{title}</h2><p className="text-xs text-gray-400 mt-1">{subtitle}</p></div></div>;
}
export function Stat({ title, value, accent = 'text-white', description }) {
  return <div className="bg-black/50 border border-neutral-800 rounded-xl p-4 min-w-0"><p className="text-[11px] uppercase tracking-wide text-gray-400">{title}</p><p className={`text-xl sm:text-2xl font-bold mt-1 break-words ${accent}`}>{value}</p>{description && <p className="text-xs text-gray-500 mt-1">{description}</p>}</div>;
}
export function Note({ children }) { return <p className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed"><Info size={15} className="text-amber-400 shrink-0 mt-0.5"/>{children}</p>; }
export function Empty({ label = 'Nenhum produto disponível para esta empresa.' }) { return <div className={`${panel} text-sm text-gray-400 text-center py-12`}>{label}</div>; }
export function Pager({ page, setPage, total, pageSize = 30 }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return pages > 1 && <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs text-gray-400"><span>Mostrando {(page-1)*pageSize+1}–{Math.min(page*pageSize,total)} de {total}</span><div className="flex gap-2"><button disabled={page <= 1} className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg disabled:opacity-30" onClick={() => setPage(p => Math.max(1,p-1))}>Anterior</button><span className="px-2 py-2">{page} / {pages}</span><button disabled={page >= pages} className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg disabled:opacity-30" onClick={() => setPage(p => Math.min(pages,p+1))}>Próxima</button></div></div>;
}
