import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Download, Trash2, TrendingUp, AlertCircle, Package, Edit3, X, Check, Search, Filter, DollarSign, Boxes } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [period, setPeriod] = useState('meses');
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', category: '', stock: '', cost: '', margin: '' });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erro ao buscar produtos:", error);
      } else {
        setProducts(data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetMargin = async (id, marginValue) => {
    const margin = parseFloat(marginValue);
    if (isNaN(margin)) return;
    
    setProducts(products.map(p => p.id === id ? { ...p, margin, is_new: false } : p));
    
    if (typeof id === 'string' && !id.startsWith('local-')) {
      await supabase.from('products').update({ margin, is_new: false }).eq('id', id);
    }
  };

  const handleRemoveMargin = async (id) => {
    setProducts(products.map(p => p.id === id ? { ...p, margin: null } : p));
    if (typeof id === 'string' && !id.startsWith('local-')) {
      await supabase.from('products').update({ margin: null }).eq('id', id);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Tem certeza de que deseja excluir este item?')) return;
    
    setProducts(products.filter(p => p.id !== id));
    
    if (typeof id === 'string' && !id.startsWith('local-')) {
      await supabase.from('products').delete().eq('id', id);
    }
  };

  const handleClearAllData = async () => {
    const confirm = window.confirm('ATENÇÃO: Tem a certeza absoluta de que deseja APAGAR TODOS os produtos da base de dados? Esta ação não pode ser desfeita.');
    
    if (confirm) {
      setUploading(true);
      setProducts([]);

      try {
        const { error } = await supabase.from('products').delete().not('id', 'is', null);

        if (error) {
          console.error("Erro ao limpar:", error);
          alert("Ocorreu um erro ao tentar limpar o banco de dados: " + error.message);
          fetchProducts(); 
        } else {
          alert("Todos os dados foram excluídos com sucesso!");
        }
      } catch (err) {
        console.error("Erro inesperado:", err);
        alert("Erro de conexão.");
        fetchProducts();
      }
      
      setUploading(false);
    }
  };

  const startEditing = (product) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      category: product.category || 'Geral',
      stock: product.stock !== undefined && product.stock !== null ? product.stock : 0,
      cost: product.cost,
      margin: product.margin !== null ? product.margin : ''
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEditing = async (id) => {
    const updatedCost = parseFloat(editForm.cost) || 0;
    const updatedStock = parseFloat(editForm.stock) || 0;
    const updatedMargin = editForm.margin === '' ? null : parseFloat(editForm.margin);

    setProducts(products.map(p => p.id === id ? { 
      ...p, 
      name: editForm.name,
      category: editForm.category,
      stock: updatedStock,
      cost: updatedCost, 
      margin: updatedMargin,
      is_new: false 
    } : p));

    setEditingId(null);

    if (typeof id === 'string' && !id.startsWith('local-')) {
      await supabase.from('products').update({ 
        name: editForm.name, 
        category: editForm.category,
        stock: updatedStock,
        cost: updatedCost, 
        margin: updatedMargin,
        is_new: false
      }).eq('id', id);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvText = event.target.result;

      Papa.parse(csvText, {
        skipEmptyLines: true,
        complete: async (results) => {
          const parsedProducts = [];
          let currentGroup = 'Geral';

          results.data.forEach(row => {
            if (!Array.isArray(row)) return;

            const clean = row.map(c => String(c || '').trim()).filter(Boolean);
            if (clean.length === 0) return;

            if (clean.some(item => item.includes('Grupo:')) && !clean.some(item => item.includes('Total'))) {
              const dashIdx = clean.indexOf('-');
              if (dashIdx !== -1 && dashIdx + 1 < clean.length) {
                currentGroup = clean[dashIdx + 1];
              }
            }

            if (clean.length >= 3 && /^\d+$/.test(clean[0]) && clean[1] === '-') {
              const code = clean[0];
              const name = clean[2];

              let cost = 0;
              if (clean.length > 3) {
                const rawCost = clean[3].replace(/\./g, '').replace(',', '.').trim();
                cost = parseFloat(rawCost) || 0;
              }

              let stock = 0;
              if (clean.length > 4) {
                const rawStock = clean[4].replace(/\./g, '').replace(',', '.').trim();
                stock = parseFloat(rawStock) || 0;
              }

              let margin = null;
              for (let i = 3; i < clean.length; i++) {
                if (clean[i].includes('%')) {
                  const rawMargin = clean[i].replace('%', '').replace(/\./g, '').replace(',', '.').trim();
                  const numMargin = parseFloat(rawMargin);
                  // Guardamos o número exato, sem arredondar
                  if (!isNaN(numMargin)) margin = numMargin;
                  break;
                }
              }

              parsedProducts.push({
                name: `${code} - ${name}`,
                category: currentGroup,
                stock: stock,
                cost: cost,
                margin: margin,
                is_new: true
              });
            }
          });

          if (parsedProducts.length === 0 && results.data.length > 1) {
            const headers = results.data[0].map(h => String(h).toLowerCase().trim());
            const nameIdx = headers.findIndex(h => /nome|produto|descri/i.test(h));
            const categoryIdx = headers.findIndex(h => /categoria|grupo|tipo/i.test(h));
            const stockIdx = headers.findIndex(h => /estoque|saldo|qtd|quant/i.test(h));
            const costIdx = headers.findIndex(h => /custo|pre[cç]o|valor/i.test(h));
            const marginIdx = headers.findIndex(h => /margem|margin/i.test(h));

            if (nameIdx !== -1) {
              results.data.slice(1).forEach(row => {
                const name = row[nameIdx];
                if (!name) return;
                const category = categoryIdx !== -1 && row[categoryIdx] ? String(row[categoryIdx]).trim() : 'Geral';
                const stock = stockIdx !== -1 ? parseFloat(String(row[stockIdx]).replace(',', '.')) || 0 : 0;
                const cost = costIdx !== -1 ? parseFloat(String(row[costIdx]).replace(',', '.')) || 0 : 0;
                let margin = null;
                if (marginIdx !== -1 && row[marginIdx]) {
                  const m = parseFloat(String(row[marginIdx]).replace('%', '').replace(',', '.'));
                  if (!isNaN(m)) margin = m;
                }
                parsedProducts.push({ name: String(name).trim(), category, stock, cost, margin, is_new: true });
              });
            }
          }

          if (parsedProducts.length === 0) {
            alert("Não foram encontrados dados no relatório.");
            setUploading(false);
            return;
          }

          const { data, error } = await supabase.from('products').insert(parsedProducts).select();

          if (error) {
            console.error("Erro Supabase:", error);
            alert("Erro ao gravar no banco: " + error.message);
            setProducts(prev => [
              ...parsedProducts.map((p, i) => ({ ...p, id: `local-${Date.now()}-${i}` })),
              ...prev
            ]);
          } else if (data) {
            setProducts(prev => [...data, ...prev]);
            alert(`${parsedProducts.length} produtos importados com sucesso!`);
          }

          setUploading(false);
          e.target.value = '';
        },
        error: () => {
          alert("Erro ao ler o arquivo CSV.");
          setUploading(false);
        }
      });
    };

    reader.readAsText(file, "ISO-8859-1");
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const categoriesList = ['todas', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(term) || 
                          (p.category && p.category.toLowerCase().includes(term));
    const matchesCategory = selectedCategory === 'todas' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const productsWithoutMargin = products.filter(p => p.margin === null || p.margin === undefined);
  const newProducts = products.filter(p => p.is_new);

  // --- CÁLCULO DO ESTOQUE E PROJEÇÃO COM MARGEM SOBRE A VENDA ---
  let totalStockUnits = 0;
  let totalCostInvested = 0;
  let totalStockProfit = 0;
  let totalSalesValue = 0;

  products.forEach(p => {
    const stockQty = Number(p.stock) || 0;
    const cost = Number(p.cost) || 0;
    totalStockUnits += stockQty;
    totalCostInvested += cost * stockQty;

    if (p.margin !== null && p.margin !== undefined) {
      const marginVal = Number(p.margin);
      let suggestedPrice = 0;
      let unitProfit = 0;

      // Fórmula correta de Margem de Lucro sobre a Venda
      if (marginVal < 100) {
        suggestedPrice = cost / (1 - (marginVal / 100));
      } else {
        // Se a margem for >= 100, assume-se que é Markup para evitar erros de divisão por zero
        suggestedPrice = cost + (cost * (marginVal / 100));
      }
      
      unitProfit = suggestedPrice - cost;
      
      totalStockProfit += unitProfit * stockQty;
      totalSalesValue += suggestedPrice * stockQty;
    }
  });

  const getPeriodProfit = () => {
    switch (period) {
      case 'dias': return totalStockProfit / 30;
      case 'semanas': return (totalStockProfit / 30) * 7;
      case 'meses': return totalStockProfit;
      case 'anos': return totalStockProfit * 12;
      default: return totalStockProfit;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans text-white">
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 border-b border-gray-800 pb-6 no-print">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black tracking-tighter text-amber-500 flex items-center gap-2"
          >
            SunMaker
          </motion.h1>
          <p className="text-gray-400 mt-1 text-sm">Dashboard de Inteligência de Margens & Estoque</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar produto ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 text-white pl-9 pr-3 py-2 rounded-lg text-sm outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="relative flex items-center">
            <Filter className="absolute left-3 text-gray-500 pointer-events-none" size={15} />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 text-white pl-8 pr-4 py-2 rounded-lg text-sm outline-none focus:border-amber-500 capitalize cursor-pointer max-w-[200px]"
            >
              <option value="todas">Todas Categorias</option>
              {categoriesList.filter(c => c !== 'todas').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <label className="cursor-pointer bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-medium">
            <Upload size={16} />
            <span>{uploading ? "Aguarde..." : "Upload Relatório"}</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>

          <button 
            onClick={handleClearAllData} 
            disabled={uploading}
            className={`border border-red-900 font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm ${uploading ? 'bg-neutral-800 text-neutral-500' : 'bg-red-950/50 text-red-500 hover:bg-red-900 hover:text-white'}`}
            title="Apagar todos os registros do banco de dados"
          >
            <Trash2 size={16} />
            Limpar Tudo
          </button>

          <button 
            onClick={handlePrintPDF} 
            className="bg-amber-500 text-black font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-amber-400 transition-all text-sm"
          >
            <Download size={16} />
            Exportar PDF
          </button>
        </div>
      </header>

      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ delay: 0.1 }}
        className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-900 p-5 rounded-2xl border border-neutral-800"
      >
        <div className="flex items-center gap-4 no-print">
          <span className="text-gray-300 font-medium text-sm">Estimativa de Período:</span>
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-black border border-neutral-700 text-white rounded-md px-3 py-1.5 text-sm outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="dias">Dias (Giro Diário)</option>
            <option value="semanas">Semanas (Giro Semanal)</option>
            <option value="meses">Meses (Giro Mensal do Lote)</option>
            <option value="anos">Anos (Projeção Anual)</option>
          </select>
        </div>
        <div className="text-left md:text-right">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold no-print">
            Projeção Estimada de Lucro ({period}):
          </p>
          <p className="text-2xl font-black text-emerald-400">
            R$ {getPeriodProfit().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-gray-500">Calculado sobre a rotatividade do estoque cadastrado</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 no-print">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-400 font-medium text-xs uppercase tracking-wider">Produtos / Itens</h3>
            <Package className="text-amber-500" size={20} />
          </div>
          <p className="text-3xl font-bold">{products.length}</p>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Boxes size={14} className="text-neutral-500" />
            <span className="text-amber-400 font-semibold">{totalStockUnits.toLocaleString('pt-BR')}</span> unidades em loja
          </p>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-400 font-medium text-xs uppercase tracking-wider">Capital Investido</h3>
            <DollarSign className="text-blue-400" size={20} />
          </div>
          <p className="text-2xl font-bold text-gray-100">
            R$ {totalCostInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">Custo total das mercadorias</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-neutral-900 p-5 rounded-2xl border border-emerald-950/70 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-emerald-400 font-medium text-xs uppercase tracking-wider">Lucro em Estoque</h3>
            <TrendingUp className="text-emerald-400" size={20} />
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            R$ {totalStockProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Venda total: <strong className="text-gray-300">R$ {totalSalesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-neutral-900 p-5 rounded-2xl border border-red-950/70 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-red-400 font-medium text-xs uppercase tracking-wider">Sem Margem</h3>
            <AlertCircle className="text-red-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-red-500">{productsWithoutMargin.length}</p>
          <p className="text-xs text-gray-500 mt-1">
            {newProducts.length > 0 ? `${newProducts.length} novos aguardando revisão` : 'Todos revisados'}
          </p>
        </motion.div>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.2 }}
        className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center no-print">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Listagem de Margens e Estoque</h2>
            {selectedCategory !== 'todas' && (
              <span className="text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-md border border-amber-500/30">
                Categoria: {selectedCategory}
              </span>
            )}
          </div>
          {(searchTerm || selectedCategory !== 'todas') && (
            <span className="text-xs text-gray-400 bg-neutral-800 px-3 py-1 rounded-full border border-neutral-700">
              Exibindo: {filteredProducts.length} de {products.length}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left print-table">
            <thead className="bg-black/60 border-b border-neutral-800 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-4">Produto</th>
                <th className="p-4">Categoria</th>
                <th className="p-4 text-center">Estoque</th>
                <th className="p-4">Custo Base</th>
                <th className="p-4">Margem (%)</th>
                <th className="p-4">Preço Sugerido</th>
                <th className="p-4 text-emerald-400">Lucro do Lote</th>
                <th className="p-4 no-print text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 italic">
                    Nenhum produto cadastrado. Faça o upload do relatório CSV.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  const isEditing = editingId === product.id;
                  const stockQty = Number(product.stock) || 0;
                  const cost = Number(product.cost) || 0;
                  const marginVal = product.margin !== null ? Number(product.margin) : null;
                  
                  let suggestedPrice = 0;
                  let unitProfit = 0;

                  if (marginVal !== null) {
                    if (marginVal < 100) {
                      suggestedPrice = cost / (1 - (marginVal / 100));
                    } else {
                      suggestedPrice = cost + (cost * (marginVal / 100));
                    }
                    unitProfit = suggestedPrice - cost;
                  }
                  
                  const lotProfit = unitProfit * stockQty;

                  return (
                    <tr key={product.id} className={`border-b border-neutral-800/60 hover:bg-white/5 transition-colors ${isEditing ? 'bg-white/5' : ''}`}>
                      <td className="p-4 font-medium">
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={editForm.name} 
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full bg-black border border-amber-500/70 rounded px-2.5 py-1 text-sm outline-none"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{product.name}</span>
                            {product.is_new && (
                              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase font-bold tracking-wider">
                                Novo
                              </span>
                            )}
                            {product.margin === null && (
                              <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full border border-red-500/30 uppercase font-bold tracking-wider">
                                Alerta
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        {isEditing ? (
                          <input 
                            type="text" 
                            value={editForm.category} 
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            className="w-28 bg-black border border-amber-500/70 rounded px-2.5 py-1 text-sm outline-none"
                          />
                        ) : (
                          <span className="text-xs bg-neutral-800 text-neutral-300 px-2 py-1 rounded border border-neutral-700">
                            {product.category || 'Geral'}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        {isEditing ? (
                          <input 
                            type="number" 
                            step="1"
                            value={editForm.stock} 
                            onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                            className="w-20 bg-black border border-amber-500/70 rounded px-2 py-1 text-sm text-center outline-none"
                          />
                        ) : (
                          <span className="font-mono text-sm text-gray-200">
                            {stockQty.toLocaleString('pt-BR')} un
                          </span>
                        )}
                      </td>
                      
                      <td className="p-4 text-gray-300 font-mono text-sm">
                        {isEditing ? (
                          <input 
                            type="number" 
                            step="0.01"
                            value={editForm.cost} 
                            onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                            className="w-24 bg-black border border-amber-500/70 rounded px-2.5 py-1 text-sm outline-none"
                          />
                        ) : (
                          `R$ ${cost.toFixed(2)}`
                        )}
                      </td>
                      
                      <td className="p-4">
                        {isEditing ? (
                          <input 
                            type="number" 
                            step="0.001"
                            value={editForm.margin} 
                            onChange={(e) => setEditForm({ ...editForm, margin: e.target.value })}
                            placeholder="%"
                            className="w-20 bg-black border border-amber-500/70 rounded px-2.5 py-1 text-sm outline-none"
                          />
                        ) : (
                          product.margin !== null ? (
                            <span className="text-amber-400 font-bold">{product.margin}%</span>
                          ) : (
                            <span className="text-gray-500 italic">Não definida</span>
                          )
                        )}
                      </td>
                      
                      <td className="p-4 font-mono text-sm">
                        {!isEditing && product.margin !== null 
                          ? <span className="text-gray-200">R$ {suggestedPrice.toFixed(2)}</span>
                          : <span className="text-gray-600">-</span>
                        }
                      </td>

                      <td className="p-4 font-mono text-sm font-semibold">
                        {!isEditing && product.margin !== null 
                          ? <span className="text-emerald-400">R$ {lotProfit.toFixed(2)}</span>
                          : <span className="text-gray-600">-</span>
                        }
                      </td>
                      
                      <td className="p-4 no-print">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => saveEditing(product.id)} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded" title="Confirmar">
                              <Check size={18} />
                            </button>
                            <button onClick={cancelEditing} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded" title="Cancelar">
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <input 
                              type="number" 
                              step="0.01"
                              placeholder="%" 
                              className="w-16 bg-black border border-neutral-700 rounded px-2 py-1 text-sm outline-none focus:border-amber-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSetMargin(product.id, e.target.value);
                              }}
                            />
                            <button 
                              onClick={() => startEditing(product)} 
                              className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-colors" 
                              title="Editar Dados"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button 
                              onClick={() => handleRemoveMargin(product.id)} 
                              className="p-1.5 text-gray-400 hover:text-orange-400 hover:bg-orange-400/10 rounded transition-colors" 
                              title="Zerar Margem"
                            >
                              <AlertCircle size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(product.id)} 
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors" 
                              title="Excluir Produto"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
