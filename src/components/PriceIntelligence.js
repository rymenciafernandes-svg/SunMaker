import React, { useMemo, useState } from 'react';
import { BrainCircuit, X, Search, AlertTriangle, TrendingUp, Info, Download } from 'lucide-react';
import { diagnose } from '@/lib/financialPlanning';

const money = n => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const validNumber = v => v !== null && v !== undefined && String(v).trim() !== '' && Number.isFinite(Number(v));

export default function PriceIntelligence({ products = [], onClose, embedded = false, calculationMode = 'markup' }) {
  const [target, setTarget] = useState('35');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('todas');
  const [filter, setFilter] = useState('todos');
  const desired = Number(target);
  const validTarget = target.trim() !== '' && Number.isFinite(desired) && desired >= 0 && desired < 100;
  const categories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))].sort(), [products]);
  const analyzed = useMemo(() => products.map(p => {
    const costValid = validNumber(p.cost) && Number(p.cost) >= 0;
    // O Dashboard não persiste `price`: usa `cost` + `margin` no modo do relatório.
    // `price` explícito tem prioridade quando estiver disponível.
    const savedMargin = validNumber(p.margin) ? Number(p.margin) : null;
    const derivedPrice = costValid && savedMargin !== null && savedMargin >= 0
      ? (calculationMode === 'markup' ? Number(p.cost) * (1 + savedMargin / 100) : savedMargin < 100 ? Number(p.cost) / (1 - savedMargin / 100) : Number(p.cost) * (1 + savedMargin / 100))
      : null;
    const actualPrice = validNumber(p.price) && Number(p.price) > 0 ? Number(p.price) : derivedPrice;
    const priceValid = actualPrice !== null && Number.isFinite(actualPrice) && actualPrice > 0;
    const cost = costValid ? Number(p.cost) : null;
    const price = priceValid ? actualPrice : null;
    const margin = cost !== null && price !== null ? (price - cost) / price * 100 : null;
    const suggested = cost !== null && validTarget ? cost / (1 - desired / 100) : null;
    const diff = suggested !== null && price !== null ? suggested - price : null;
    const status = margin === null ? 'incompleto' : margin < 0 ? 'prejuizo' : validTarget && margin + 0.000001 < desired ? 'abaixo' : 'adequado';
    return { ...p, cost, price, margin, suggested, diff, status };
  }), [products, desired, validTarget, calculationMode]);
  const diagnosis = useMemo(() => validTarget ? diagnose(products, calculationMode, desired) : null, [products, calculationMode, desired, validTarget]);
  const [diagnosisOpen, setDiagnosisOpen] = useState(true);
  const exportDiagnosis = async () => {
    if(!diagnosis) return;
    const {jsPDF} = await import('jspdf');
    const doc = new jsPDF();
    const lines = [
      'SunMaker - Diagnostico Comercial',
      `Data: ${new Date().toLocaleDateString('pt-BR')}`,
      `Meta de margem bruta: ${desired.toFixed(2)}%`,
      `Produtos analisados: ${diagnosis.count}`,
      `Saude comercial (indice orientativo): ${diagnosis.score ?? 'N/D'}/100`,
      `Produtos com prejuizo: ${diagnosis.loss}`,
      `Produtos abaixo da meta: ${diagnosis.below}`,
      `Produtos sem dados suficientes: ${diagnosis.incomplete}`,
      `Margem media simples: ${diagnosis.avgMargin?.toFixed(2) ?? 'N/D'}%`,
      `Capital em estoque abaixo da meta: ${money(diagnosis.riskCapital)}`,
      'Recomendacoes por prioridade:',
      ...(diagnosis.loss ? [`ALTA: revisar ${diagnosis.loss} produtos com preco abaixo do custo.`] : []),
      ...(diagnosis.below ? [`MEDIA: avaliar ${diagnosis.below} produtos abaixo da margem desejada.`] : []),
      ...(diagnosis.incomplete ? [`MEDIA: conferir ${diagnosis.incomplete} cadastros incompletos.`] : []),
      'Observacao: diagnostico matematico baseado nos dados disponiveis.',
      'Nao representa previsao de vendas ou lucro realizado.'
    ];
    doc.setFontSize(11); let y=18; for(const line of lines){ const parts=doc.splitTextToSize(line,175); if(y+parts.length*7>280){doc.addPage();y=18;}doc.text(parts,16,y);y+=parts.length*7+3;}
    doc.save('SunMaker-Diagnostico-Comercial.pdf');
  };
  const visible = useMemo(() => analyzed.filter(p => (category === 'todas' || p.category === category) && (filter === 'todos' || p.status === filter) && `${p.name || ''} ${p.code || ''} ${p.category || ''}`.toLowerCase().includes(search.toLowerCase())).sort((a,b) => ({prejuizo:0,abaixo:1,incompleto:2,adequado:3}[a.status] - {prejuizo:0,abaixo:1,incompleto:2,adequado:3}[b.status])), [analyzed, category, filter, search]);
  const count = s => analyzed.filter(p => p.status === s).length;
  const inputClass = 'w-full min-w-0 bg-black border border-neutral-700 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500 text-sm';
  return <div className={embedded ? "w-full no-print" : "fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-2 sm:p-4 no-print"} onMouseDown={e => { if(e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label="Análise Inteligente de Preços" className={embedded ? "w-full bg-neutral-900 border border-neutral-700 rounded-2xl p-4 sm:p-6 text-white shadow-2xl" : "w-full max-w-5xl max-h-[94vh] overflow-y-auto bg-neutral-900 border border-neutral-700 rounded-2xl p-4 sm:p-6 text-white shadow-2xl"}>
      <div className="flex items-start justify-between gap-3 mb-3"><div><h2 className="text-lg sm:text-xl font-bold flex items-center gap-2"><BrainCircuit size={22} className="text-amber-500"/> Análise Inteligente de Preços</h2><p className="text-xs text-gray-400 mt-1">Recomendações calculadas sobre o preço de venda. Nenhum dado é alterado.</p></div><button onClick={onClose} aria-label="Fechar análise" className="p-2 rounded-lg hover:bg-neutral-800"><X size={20}/></button></div>
      <div className="bg-black/40 border border-neutral-800 rounded-xl p-3 sm:p-4 mb-4"><label className="text-sm text-gray-300 font-medium">Margem desejada para esta análise (%)<input type="number" min="0" max="99.99" step="0.1" value={target} onChange={e => setTarget(e.target.value)} className={`${inputClass} mt-2 sm:max-w-xs`}/></label><p className="text-xs text-gray-500 mt-2">A meta é temporária e não é salva no Supabase. Preços sugeridos não incluem custos, impostos ou taxas que não estejam no custo cadastrado.</p>{!validTarget && <p className="text-sm text-red-400 mt-2">Informe uma margem entre 0% e menos de 100% para gerar sugestões.</p>}</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">{[['Analisados',analyzed.length,'text-white'],['Prejuízo',count('prejuizo'),'text-red-400'],['Abaixo da meta',validTarget ? count('abaixo') : '—','text-amber-400'],['Dados incompletos',count('incompleto'),'text-gray-300']].map(([label,value,color]) => <div key={label} className="rounded-xl bg-black/50 border border-neutral-800 p-3"><p className="text-xs text-gray-400">{label}</p><p className={`text-xl sm:text-2xl font-bold mt-1 ${color}`}>{value}</p></div>)}</div>
      <section className="rounded-xl border border-amber-500/20 bg-black/40 p-3 sm:p-4 mb-4 space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2"><div><h3 className="font-bold text-amber-400">Diagnóstico Comercial</h3><p className="text-xs text-gray-400">Indicadores e recomendações calculados a partir dos produtos disponíveis.</p></div><div className="flex gap-2"><button type="button" onClick={()=>setDiagnosisOpen(x=>!x)} className="text-xs px-3 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-800">{diagnosisOpen?'Recolher':'Expandir'}</button><button type="button" onClick={exportDiagnosis} disabled={!diagnosis} className="text-xs px-3 py-2 rounded-lg bg-amber-500 text-black font-semibold disabled:opacity-40 inline-flex gap-1 items-center"><Download size={14}/> PDF</button></div></div>
        {diagnosisOpen && (diagnosis ? <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">{[['Saúde comercial',diagnosis.score===null?'—':`${diagnosis.score}/100`],['Margem média',diagnosis.avgMargin===null?'—':`${diagnosis.avgMargin.toFixed(2)}%`],['Oportunidades',diagnosis.below],['Riscos de prejuízo',diagnosis.loss]].map(([label,value])=><div key={label} className="rounded-lg bg-neutral-900 border border-neutral-800 p-3"><p className="text-xs text-gray-400">{label}</p><p className="text-lg font-bold mt-1">{value}</p></div>)}</div>
          <div className="space-y-2 text-sm"><p className="text-gray-300">Capital em estoque com margem abaixo da meta: <strong className="text-amber-400">{money(diagnosis.riskCapital)}</strong></p>
            {diagnosis.loss>0 && <p className="text-red-400">Prioridade alta: revisar {diagnosis.loss} produto(s) com preço inferior ao custo.</p>}
            {diagnosis.below>0 && <p className="text-amber-400">Prioridade média: avaliar reajustes em {diagnosis.below} produto(s) abaixo da meta.</p>}
            {diagnosis.incomplete>0 && <p className="text-gray-300">Conferir {diagnosis.incomplete} produto(s) sem informações suficientes.</p>}
            {diagnosis.count>0 && !diagnosis.loss && !diagnosis.below && !diagnosis.incomplete && <p className="text-emerald-400">Todos os produtos analisados estão dentro dos critérios definidos.</p>}
            {diagnosis.count===0 && <p className="text-gray-400">Nenhum produto disponível para diagnóstico.</p>}
          </div>
          <p className="text-xs text-gray-500">Pontuação orientativa: 20% completude dos dados, 55% produtos dentro da meta e 25% produtos sem prejuízo. Não mede saúde financeira real. Capital em risco indica custo do estoque abaixo da meta, não perda financeira realizada.</p>
        </> : <p className="text-sm text-gray-400">Informe uma margem desejada válida para gerar o diagnóstico.</p>)}
      </section>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4"><label className="relative"><Search size={16} className="absolute left-3 top-3 text-gray-500"/><input aria-label="Buscar produto" placeholder="Buscar produto ou código" value={search} onChange={e => setSearch(e.target.value)} className={`${inputClass} pl-9`}/></label><select aria-label="Filtrar categoria" className={inputClass} value={category} onChange={e => setCategory(e.target.value)}><option value="todas">Todas as categorias</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select><select aria-label="Filtrar situação" className={inputClass} value={filter} onChange={e => setFilter(e.target.value)}><option value="todos">Todas as situações</option><option value="prejuizo">Prejuízo</option><option value="abaixo">Abaixo da meta</option><option value="adequado">Dentro da meta</option><option value="incompleto">Dados incompletos</option></select></div>
      <p className="text-xs text-gray-400 mb-3">Exibindo {visible.length} de {analyzed.length} produtos. A sugestão é matemática, não uma previsão de demanda ou preço de mercado.</p>
      <div className={embedded ? "space-y-2" : "space-y-2 max-h-[40vh] overflow-y-auto pr-1"}>{visible.length === 0 && <p className="text-sm text-gray-400 text-center p-6">Nenhum produto encontrado.</p>}{visible.map((p,i) => <div key={p.id ?? i} className="rounded-xl border border-neutral-800 bg-black/40 p-3 sm:p-4"><div className="flex items-start justify-between gap-2 mb-3"><div className="min-w-0"><p className="font-semibold break-words">{p.name || 'Produto sem nome'}</p><p className="text-xs text-gray-500">{p.category || 'Sem categoria'}</p></div><span className={`text-xs px-2 py-1 rounded-md shrink-0 ${p.status === 'prejuizo' ? 'bg-red-500/15 text-red-400' : p.status === 'abaixo' ? 'bg-amber-500/15 text-amber-400' : p.status === 'adequado' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-neutral-700 text-gray-300'}`}>{({prejuizo:'Prejuízo',abaixo:'Abaixo da meta',adequado:'Dentro da meta',incompleto:'Dados incompletos'})[p.status]}</span></div><div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">{[['Custo',p.cost === null ? '—' : money(p.cost)],['Preço atual',p.price === null ? '—' : money(p.price)],['Margem atual',p.margin === null ? '—' : `${p.margin.toFixed(2)}%`],['Preço sugerido',p.suggested === null ? '—' : money(p.suggested)],['Diferença/unidade',p.diff === null ? '—' : money(p.diff)]].map(([label,value]) => <div key={label}><p className="text-xs text-gray-500 mb-1">{label}</p><p className="font-semibold break-words">{value}</p></div>)}</div>{p.status === 'incompleto' && <p className="text-xs text-amber-400 mt-3 flex gap-1 items-center"><AlertTriangle size={13}/> Verifique custo e preço de venda cadastrados.</p>}{p.status === 'abaixo' && p.diff > 0 && <p className="text-xs text-gray-400 mt-3 flex gap-1 items-center"><TrendingUp size={13}/> Para atingir a meta, o preço precisaria aumentar {money(p.diff)} por unidade.</p>}</div>)}</div>
      <div className="flex gap-2 items-start mt-4 text-xs text-gray-500"><Info size={15} className="shrink-0"/><span>Quando não há preço de venda explícito, o preço é calculado a partir do custo e da margem cadastrada, respeitando o modo de cálculo detectado no relatório. Sem dados suficientes, a análise sinaliza dados incompletos. Valores sugeridos são estimativas de margem bruta.</span></div>
    </div>
  </div>;
}
