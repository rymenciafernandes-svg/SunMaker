import React, { useMemo, useState } from 'react';
import { BarChart3, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { analyzeProducts, brl, percent } from '@/lib/commerce';
import { exportXlsx } from '@/lib/exportCommerce';
import { Empty, Intro, Note, panel, Stat, inputClass } from './shared';

export default function ReportsView({ products = [], calculationMode = 'markup' }) {
  const [category, setCategory] = useState('todas');
  const [exporting, setExporting] = useState(false);
  const items = useMemo(() => analyzeProducts(products, calculationMode), [products, calculationMode]);
  const categories = useMemo(() => [...new Set(items.map(p => p.category))].sort((a,b) => a.localeCompare(b,'pt-BR')), [items]);
  const selected = useMemo(() => items.filter(p => category === 'todas' || p.category === category), [items, category]);
  const stats = useMemo(() => {
    const data = new Map();
    for (const p of selected) {
      const row = data.get(p.category) || { name: p.category, items: 0, stock: 0, investment: 0, revenue: 0, profit: 0 };
      row.items++; row.stock += p.stock; row.investment += p.stockCost; row.revenue += p.stockRevenue; row.profit += p.stockProfit; data.set(p.category, row);
    }
    const groups = [...data.values()].sort((a, b) => b.profit - a.profit);
    return { groups, productCount: selected.length, known: selected.filter(p => p.valid).length,
      invested: selected.reduce((s,p)=>s+p.stockCost,0), potential: selected.reduce((s,p)=>s+p.stockProfit,0),
      revenue: selected.reduce((s,p)=>s+p.stockRevenue,0), stock: selected.reduce((s,p)=>s+p.stock,0),
      leaders: [...selected].filter(p=>p.valid).sort((a,b)=>b.stockProfit-a.stockProfit).slice(0,8) };
  }, [selected]);
  const rows = selected.map(p => [p.code, p.name, p.category, p.stock, p.cost ?? '', p.price ?? '', p.marginPct ?? '', p.stockCost, p.stockProfit, p.valid ? 'Calculado' : 'Sem margem/preço']);
  const headers = ['Código','Produto','Categoria','Estoque','Custo unitário (R$)','Preço estimado (R$)','Margem bruta (%)','Capital em estoque (R$)','Lucro bruto potencial (R$)','Situação'];
  const exportPdf = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      let y = 19;
      doc.setFont('helvetica','bold'); doc.setFontSize(17); doc.text('SunMaker - Relatorio Gerencial', 14, y);
      doc.setFont('helvetica','normal'); doc.setFontSize(10); y += 10;
      const detail = [`Categoria: ${category === 'todas' ? 'Todas' : category}`, `Produtos: ${stats.productCount} | Estoque: ${stats.stock.toLocaleString('pt-BR')}`, `Capital em estoque: ${brl(stats.invested)}`, `Receita potencial: ${brl(stats.revenue)}`, `Lucro bruto potencial: ${brl(stats.potential)}`, `Produtos com dados para calculo: ${stats.known} de ${stats.productCount}`];
      for (const line of detail) { doc.text(line,14,y); y+=7; }
      y+=8; doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text('Categorias (lucro bruto potencial)', 14, y); y+=8;
      doc.setFont('helvetica','normal'); doc.setFontSize(9);
      for(const row of stats.groups) {
        if (y>274) {doc.addPage(); y=18;}
        const name = doc.splitTextToSize(row.name, 110)[0];
        doc.text(name,14,y); doc.text(brl(row.profit), 190,y,{align:'right'}); y+=6;
      }
      if (y>250) {doc.addPage(); y=18;} else y+=8;
      doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text('Produtos com maior lucro potencial no estoque',14,y); y+=8;
      doc.setFont('helvetica','normal'); doc.setFontSize(9);
      for (const p of stats.leaders) {
        if (y>274) {doc.addPage(); y=18;}
        doc.text(doc.splitTextToSize(p.name, 113)[0],14,y); doc.text(brl(p.stockProfit),190,y,{align:'right'}); y+=6;
      }
      if (y>263) {doc.addPage(); y=18;} else y+=8;
      doc.setFontSize(8); doc.text('Estimativas baseadas no estoque e nas margens cadastradas. Nao representam vendas realizadas.', 14, y);
      doc.save('SunMaker-relatorio-gerencial.pdf');
    } catch(err) { console.error(err); window.alert('Não foi possível gerar o PDF. Confira o console.'); }
    finally { setExporting(false); }
  };
  return <div className={`${panel} space-y-5 no-print`}>
    <Intro icon={BarChart3} title="Relatórios Gerenciais" subtitle="Indicadores e comparativos gerados com os produtos da empresa ativa, sem alterar o banco."/>
    {items.length === 0 ? <Empty/> : <>
      <div className="flex flex-wrap items-end gap-3"><label className="text-xs text-gray-400 flex-1 min-w-[180px] max-w-sm">Categoria<select className={`${inputClass} mt-2`} value={category} onChange={e=>setCategory(e.target.value)}><option value="todas">Todas as categorias</option>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select></label><button onClick={()=>exportXlsx('SunMaker-relatorio-gerencial.xlsx',headers,rows)} className="px-3 py-2.5 text-sm rounded-lg border border-amber-500/40 text-amber-400 flex items-center gap-2 hover:bg-amber-500/10"><FileSpreadsheet size={16}/> Exportar Excel</button><button disabled={exporting} onClick={exportPdf} className="px-3 py-2.5 text-sm rounded-lg border border-neutral-700 bg-neutral-800 flex items-center gap-2 disabled:opacity-40"><FileText size={16}/> {exporting ? 'Gerando...' : 'Exportar PDF'}</button></div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3"><Stat title="Produtos" value={stats.productCount.toLocaleString('pt-BR')}/><Stat title="Capital em estoque" value={brl(stats.invested)}/><Stat title="Receita potencial" value={brl(stats.revenue)} accent="text-blue-400"/><Stat title="Lucro bruto potencial" value={brl(stats.potential)} accent={stats.potential<0?'text-red-400':'text-emerald-400'}/></div>
      <Note>Estimativas calculadas a partir do estoque atual e das margens do relatório, não do histórico de vendas. {stats.productCount-stats.known} produto(s) sem dados suficientes para calcular preço e lucro.</Note>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="rounded-xl bg-black/40 border border-neutral-800 p-4 min-w-0"><h3 className="text-sm font-bold mb-4">Lucro potencial por categoria</h3>{stats.groups.length===0 ? <p className="text-sm text-gray-400">Sem dados</p> : stats.groups.slice(0,12).map(g => {const max=Math.max(1,...stats.groups.map(x=>Math.abs(x.profit))); return <div key={g.name} className="mb-4"><div className="flex justify-between gap-2 text-xs mb-1"><span className="truncate">{g.name}</span><span className={g.profit<0?'text-red-400':'text-emerald-400'}>{brl(g.profit)}</span></div><div className="h-2 rounded-full bg-neutral-800 overflow-hidden"><div className={`h-full rounded-full ${g.profit<0?'bg-red-500':'bg-amber-500'}`} style={{width:`${Math.max(1,Math.abs(g.profit)/max*100)}%`}}/></div></div>})}</section>
        <section className="rounded-xl bg-black/40 border border-neutral-800 p-4 min-w-0"><h3 className="text-sm font-bold mb-4">Maiores lucros potenciais no estoque</h3>{stats.leaders.length===0?<p className="text-sm text-gray-400">Não há produtos com preço calculável.</p>:stats.leaders.map((p,i)=><div key={String(p.id) + i} className="flex items-center justify-between gap-3 py-2 border-b border-neutral-800 last:border-0"><span className="text-xs text-gray-300 min-w-0 truncate"><span className="text-amber-400 mr-2">{i+1}.</span>{p.name}</span><span className="text-xs font-semibold text-emerald-400 shrink-0">{brl(p.stockProfit)}</span></div>)}</section>
      </div>
    </>}
  </div>;
}
