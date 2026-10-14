import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Download, Trash2, TrendingUp, AlertCircle, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [period, setPeriod] = useState('meses');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        setProducts([
          { id: 'mock-1', name: 'Produto A (Exemplo)', cost: 100, margin: 8, is_new: false },
          { id: 'mock-2', name: 'Produto B (Exemplo)', cost: 50, margin: null, is_new: false }
        ]);
      } else {
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetMargin = async (id, marginValue) => {
    const margin = parseFloat(marginValue);
    if (isNaN(margin)) return;
    
    setProducts(products.map(p => p.id === id ? { ...p, margin, is_new: false } : p));
    
    // Atualiza no Supabase se não for dado fictício
    if (typeof id === 'string' && !id.startsWith('mock-')) {
      await supabase.from('products').update({ margin, is_new: false }).eq('id', id);
    }
  };

  const handleRemoveMargin = async (id) => {
    setProducts(products.map(p => p.id === id ? { ...p, margin: null } : p));
    if (typeof id === 'string' && !id.startsWith('mock-')) {
      await supabase.from('products').update({ margin: null }).eq('id', id);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        // Leitura flexível de colunas (aceita Produto, Descrição, Nome, Custo, Preço, etc.)
        const newProducts = results.data.map(row => {
          const keys = Object.keys(row);
          const nameKey = keys.find(k => /^(nome|name|produto|descri)/i.test(k.trim()));
          const costKey = keys.find(k => /^(custo|cost|pre[cç]o|valor|vl)/i.test(k.trim()));
          const marginKey = keys.find(k => /^(margem|margin)/i.test(k.trim()));

          const name = nameKey ? String(row[nameKey]).trim() : null;
          
          let rawCost = costKey ? String(row[costKey]).replace('R$', '').replace(/\s/g, '').replace(',', '.') : '0';
          const cost = parseFloat(rawCost) || 0;
          
          let margin = null;
          if (marginKey && row[marginKey] !== undefined && row[marginKey] !== '') {
            const parsedMargin = parseFloat(String(row[marginKey]).replace('%', '').replace(',', '.'));
            if (!isNaN(parsedMargin)) margin = parsedMargin;
          }

          return {
            name,
            cost,
            margin,
            is_new: true
          };
        }).filter(p => p.name && p.name.length > 0);

        if (newProducts.length === 0) {
          alert("Não foram encontrados dados válidos. Certifique-se de que a folha tem uma coluna com o nome do produto ('Nome' ou 'Produto') e outra com o valor ('Custo' ou 'Preço').");
          setUploading(false);
          return;
        }

        // Grava diretamente no Supabase
        const { data, error } = await supabase.from('products').insert(newProducts).select();

        if (error) {
          console.error("Erro Supabase:", error);
          alert("Erro ao gravar no Supabase: " + error.message);
          // Fallback: visualiza em modo local caso haja pendências no banco
          setProducts(prev => [...newProducts.map((p, i) => ({ ...p, id: `local-${Date.now()}-${i}` })), ...prev]);
        } else if (data) {
          // Remove os exemplos mock se existirem e adiciona os novos do banco
          setProducts(prev => [...data, ...prev.filter(p => !String(p.id).startsWith('mock-'))]);
          alert(`${newProducts.length} produto(s) importado(s) com sucesso!`);
        }

        setUploading(false);
        e.target.value = '';
      },
      error: () => {
        alert("Erro ao processar o ficheiro CSV.");
        setUploading(false);
      }
    });
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const productsWithoutMargin = products.filter(p => p.margin === null || p.margin === undefined);
  const newProducts = products.filter(p => p.is_new);

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans text-white">
      <header className="flex justify-between items-center mb-10 border-b border-gray-800 pb-6 no-print">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black tracking-tighter text-primary flex items-center gap-2"
          >
            SunMaker
          </motion.h1>
          <p className="text-gray-400 mt-1">Dashboard de Inteligência de Margens</p>
        </div>
        
        <div className="flex gap-4">
          <label className="cursor-pointer bg-surface hover:bg-surfaceHover border border-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-all">
            <Upload size={18} />
            <span>{uploading ? "A importar..." : "Upload Relatório"}</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
          <button onClick={handlePrintPDF} className="bg-primary text-black font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-yellow-500 transition-all">
            <Download size={18} />
            Exportar PDF
          </button>
        </div>
      </header>

      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="mb-8 flex justify-between items-center bg-surface p-4 rounded-xl border border-gray-800 no-print"
      >
        <div className="flex items-center gap-4">
          <span className="text-gray-400">Estimativa de Período:</span>
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-black border border-gray-700 rounded-md px-3 py-1 outline-none focus:border-primary"
          >
            <option value="dias">Dias</option>
            <option value="semanas">Semanas</option>
            <option value="meses">Meses</option>
            <option value="anos">Anos</option>
          </select>
        </div>
        <div className="text-sm text-gray-400">
          Projeção de Lucro/Perda baseada em: <strong className="text-white capitalize">{period}</strong>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 no-print">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-surface p-6 rounded-2xl border border-gray-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 font-medium">Total de Produtos</h3>
            <Package className="text-primary" size={24} />
          </div>
          <p className="text-4xl font-bold">{products.length}</p>
        </motion.div>
        
        <motion.div whileHover={{ scale: 1.02 }} className="bg-surface p-6 rounded-2xl border border-red-900/50 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-red-400 font-medium">Sem Margem Definida</h3>
            <AlertCircle className="text-red-500" size={24} />
          </div>
          <p className="text-4xl font-bold text-red-500">{productsWithoutMargin.length}</p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-surface p-6 rounded-2xl border border-green-900/50 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-green-400 font-medium">Novos Cadastros</h3>
            <TrendingUp className="text-green-500" size={24} />
          </div>
          <p className="text-4xl font-bold text-green-500">{newProducts.length}</p>
          <p className="text-xs text-gray-500 mt-2">Aguardando definição de margem</p>
        </motion.div>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
        className="bg-surface rounded-2xl border border-gray-800 overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-gray-800 flex justify-between items-center no-print">
          <h2 className="text-xl font-bold">Listagem de Margens</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left print-table">
            <thead className="bg-black/50 border-b border-gray-800 text-gray-400 text-sm">
              <tr>
                <th className="p-4">Produto</th>
                <th className="p-4">Custo Base</th>
                <th className="p-4">Margem (%)</th>
                <th className="p-4">Preço Final Sugerido</th>
                <th className="p-4 no-print text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                  <td className="p-4 font-medium flex items-center gap-2">
                    {product.name}
                    {product.is_new && <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full border border-green-500/30 uppercase tracking-wider font-bold">Novo</span>}
                    {product.margin === null && <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full border border-red-500/30 uppercase tracking-wider font-bold">Alerta</span>}
                  </td>
                  <td className="p-4 text-gray-300">R$ {Number(product.cost).toFixed(2)}</td>
                  <td className="p-4">
                    {product.margin !== null ? (
                      <span className="text-primary font-bold">{product.margin}%</span>
                    ) : (
                      <span className="text-gray-500 italic">Não definida</span>
                    )}
                  </td>
                  <td className="p-4">
                    {product.margin !== null 
                      ? <span className="text-green-400 font-medium">R$ {(product.cost * (1 + product.margin / 100)).toFixed(2)}</span>
                      : <span className="text-gray-600">-</span>
                    }
                  </td>
                  <td className="p-4 no-print">
                    <div className="flex items-center justify-center gap-2">
                      <input 
                        type="number" 
                        placeholder="%" 
                        className="w-16 bg-black border border-gray-700 rounded px-2 py-1 text-sm outline-none focus:border-primary"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSetMargin(product.id, e.target.value);
                        }}
                        onBlur={(e) => { if (e.target.value) handleSetMargin(product.id, e.target.value); }}
                      />
                      <button 
                        onClick={() => handleRemoveMargin(product.id)}
                        className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        title="Remover Margem"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
