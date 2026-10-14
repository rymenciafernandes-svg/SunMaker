import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Download, Trash2, Edit3, Plus, TrendingUp, AlertCircle, Package } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [period, setPeriod] = useState('meses'); // anos, meses, semanas, dias
  const [uploading, setUploading] = useState(false);

  // Mock initial data if Supabase isn't connected yet
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    // Para fins de demonstração, inicializamos com mock se falhar ou se não houver dados.
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
    if (error || !data || data.length === 0) {
      setProducts([
        { id: 1, name: 'Produto A (Exemplo)', cost: 100, margin: 20, is_new: true },
        { id: 2, name: 'Produto B (Exemplo)', cost: 50, margin: null, is_new: false },
        { id: 3, name: 'Produto C (Exemplo)', cost: 200, margin: 50, is_new: true },
      ]);
    } else {
      setProducts(data);
    }
  };

  const handleSetMargin = async (id, marginValue) => {
    const margin = parseFloat(marginValue);
    if(isNaN(margin)) return;
    
    // Atualiza local
    setProducts(products.map(p => p.id === id ? { ...p, margin, is_new: false } : p));
    // Atualiza banco
    await supabase.from('products').update({ margin, is_new: false }).eq('id', id);
  };

  const handleRemoveMargin = async (id) => {
    setProducts(products.map(p => p.id === id ? { ...p, margin: null } : p));
    await supabase.from('products').update({ margin: null }).eq('id', id);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const newProducts = results.data.map(row => ({
          name: row.nome || row.name,
          cost: parseFloat(row.custo || row.cost || 0),
          margin: row.margem ? parseFloat(row.margem) : null,
          is_new: true
        })).filter(p => p.name);
        
        // Inserir no Supabase (descomentar se backend configurado)
        // const { data } = await supabase.from('products').insert(newProducts).select();
        
        // Atualizar estado local para visualização imediata
        setProducts([...newProducts.map((p, i) => ({...p, id: Date.now()+i})), ...products]);
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
      {/* Header */}
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
            <span>{uploading ? "Lendo..." : "Upload Relatório"}</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
          </label>
          <button onClick={handlePrintPDF} className="bg-primary text-black font-bold px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-yellow-500 transition-all">
            <Download size={18} />
            Exportar PDF
          </button>
        </div>
      </header>

      {/* Estimativa de Período & Filtros */}
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

      {/* Cards de Animação de Caixa */}
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

      {/* Tabela Principal */}
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
                          if(e.key === 'Enter') handleSetMargin(product.id, e.target.value);
                        }}
                        onBlur={(e) => { if(e.target.value) handleSetMargin(product.id, e.target.value) }}
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
