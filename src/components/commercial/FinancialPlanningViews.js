import React, {useMemo,useState} from 'react';
import {Calculator, TrendingUp, Info} from 'lucide-react';
import {breakEven,scenario,numeric} from '@/lib/financialPlanning';
import {brl} from '@/lib/commerce';
const field='w-full bg-black border border-neutral-700 rounded-lg px-3 py-2.5 text-white outline-none focus:border-amber-500 text-sm mt-1';
const panel='bg-neutral-900 border border-neutral-700 rounded-2xl p-4 sm:p-6 text-white shadow-2xl';
function Field({label,value,setValue,min='0',max,step='0.01'}) {return <label className="block text-sm text-gray-300">{label}<input type="number" min={min} max={max} step={step} value={value} onChange={e=>setValue(e.target.value)} className={field}/></label>}
function Stat({label,value,color='text-white'}) {return <div className="rounded-xl border border-neutral-800 bg-black/40 p-4"><p className="text-xs text-gray-400">{label}</p><p className={`text-xl font-bold mt-2 break-words ${color}`}>{value}</p></div>}
export default function FinancialPlanningViews({view}) {
  const [fixed,setFixed]=useState('5000');
  const [variable,setVariable]=useState('55');
  const [ticket,setTicket]=useState('100');
  const [base,setBase]=useState('20000');
  const [down,setDown]=useState('-20');
  const [up,setUp]=useState('20');
  const equilibrium=useMemo(()=>breakEven(fixed,variable,ticket),[fixed,variable,ticket]);
  const scenarios=useMemo(()=>[['Pessimista',down],['Base','0'],['Otimista',up]].map(([label,change])=>({label,change,values:scenario(base,fixed,variable,change)})),[base,fixed,variable,down,up]);
  const isBreakEven=view==='breakeven';
  return <section className={`${panel} space-y-5`}>
    <div className="flex items-start gap-3"><div className="rounded-xl bg-amber-500/10 p-3 text-amber-500">{isBreakEven?<Calculator size={23}/>:<TrendingUp size={23}/>}</div><div><h2 className="text-xl font-bold">{isBreakEven?'Ponto de Equilíbrio':'Projeção de Cenários'}</h2><p className="text-sm text-gray-400 mt-1">Simulação com valores informados por você. Não altera produtos, vendas ou dados do Supabase.</p></div></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <Field label="Despesas fixas do período (R$)" value={fixed} setValue={setFixed}/>
      <Field label="Custos e despesas variáveis sobre as vendas (%)" value={variable} setValue={setVariable} max="99.99"/>
      {isBreakEven?<Field label="Ticket médio estimado (R$) — opcional" value={ticket} setValue={setTicket}/>:<Field label="Faturamento base estimado do período (R$)" value={base} setValue={setBase}/>}
    </div>
    {isBreakEven ? <>
      {!equilibrium?<p role="alert" className="text-red-400 text-sm">Preencha despesas fixas válidas e um percentual variável entre 0% e menos de 100%.</p>:<><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><Stat label="Faturamento para equilibrar" value={brl(equilibrium.revenue)} color="text-amber-400"/><Stat label="Margem de contribuição" value={`${equilibrium.contributionPercent.toLocaleString('pt-BR',{maximumFractionDigits:2})}%`}/><Stat label="Quantidade aproximada de vendas" value={equilibrium.units===null?'Informe um ticket válido':equilibrium.units.toLocaleString('pt-BR')}/></div><p className="text-xs text-gray-400">Faturamento necessário = despesas fixas ÷ margem de contribuição. A quantidade usa o ticket médio como valor por venda e é arredondada para cima.</p></>}
    </>:<>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><Field label="Variação pessimista do faturamento (%)" min="-100" max="1000" value={down} setValue={setDown}/><Field label="Variação otimista do faturamento (%)" min="-100" max="1000" value={up} setValue={setUp}/></div>
      {scenarios.some(s=>!s.values)?<p role="alert" className="text-red-400 text-sm">Confira os valores: faturamento e despesas não negativos, percentual variável abaixo de 100% e variações entre -100% e 1000%.</p>:<div className="grid grid-cols-1 lg:grid-cols-3 gap-3">{scenarios.map(s=><div key={s.label} className="bg-black/40 border border-neutral-800 rounded-xl p-4 space-y-3"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold text-amber-400">{s.label}</h3><span className="text-xs text-gray-400">{numeric(s.change)>0?'+':''}{s.change}%</span></div><p className="text-xs text-gray-400">Faturamento</p><p className="text-xl font-bold">{brl(s.values.revenue)}</p><div className="text-sm space-y-2"><p>Custos variáveis: <strong>{brl(s.values.variableCost)}</strong></p><p>Despesas fixas: <strong>{brl(s.values.fixedCost)}</strong></p><p>Margem de contribuição: <strong>{brl(s.values.contribution)}</strong></p></div><div className="border-t border-neutral-800 pt-3"><p className="text-xs text-gray-400">Resultado operacional estimado</p><p className={`text-xl font-bold ${s.values.result<0?'text-red-400':'text-emerald-400'}`}>{brl(s.values.result)}</p></div></div>)}</div>}
    </>}
    <p className="text-xs text-gray-400 flex gap-2 items-start"><Info size={15} className="shrink-0 mt-0.5"/>Sem histórico de vendas e despesas operacionais, o SunMaker não pode projetar resultados reais automaticamente. Estes cálculos usam apenas as premissas digitadas, para um mesmo período (por exemplo, mês). Não incluem impostos ou outros gastos não informados no percentual variável.</p>
  </section>;
}
