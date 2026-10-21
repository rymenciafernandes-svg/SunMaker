import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, Download, Trash2, TrendingUp, AlertCircle, Package, 
  Edit3, X, Check, Search, Filter, DollarSign, Boxes, Zap, 
  Eye, EyeOff, HelpCircle, Info, FileText, LogOut, Users, UserPlus, Shield, Key,
  BookOpen, Calculator, FileSpreadsheet, PhoneCall, Scale, Lock, Building2,
  Settings, Sliders, Printer, Camera, User, ToggleLeft, ToggleRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';

const LOGIN_BG_IMAGE = "https://images.unsplash.com/photo-1545459720-aac8509eb02c?q=80&w=1920&auto=format&fit=crop"; 

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Estados de Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

  // Modais Institucionais
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Controle de Leitura Obrigatória
  const [readHelp, setReadHelp] = useState(false);
  const [readTerms, setReadTerms] = useState(false);
  const [readPrivacy, setReadPrivacy] = useState(false);

  // Modal Central de Configurações
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('usuarios');

  // Configurações - Usuários da Empresa
  const [usersList, setUsersList] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState('operador');
  const [editingPasswordUserId, setEditingPasswordUserId] = useState(null);
  const [updatedPasswordValue, setUpdatedPasswordValue] = useState('');

  // Configurações - Painel B2B do Administrador Geral (Gestão de Empresas)
  const [companiesList, setCompaniesList] = useState([]);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanySlug, setNewCompanySlug] = useState('');
  const [newCompanyPhone, setNewCompanyPhone] = useState('');
  const [newCompanyAdminUser, setNewCompanyAdminUser] = useState('');
  const [newCompanyAdminPass, setNewCompanyAdminPass] = useState('');

  // Configurações - Margem Global
  const [globalMarginValue, setGlobalMarginValue] = useState('50');

  // Referência para upload de avatar
  const avatarInputRef = useRef(null);

  // Estados do Dashboard
  const [products, setProducts] = useState([]);
  const [period, setPeriod] = useState('meses');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', category: '', stock: '', cost: '', margin: '', price: '' });
  const [calculationMode, setCalculationMode] = useState('markup');

  const isSuperAdmin = currentUser?.username === 'admin' || currentUser?.role === 'superadmin';

  useEffect(() => {
    const savedUser = localStorage.getItem('sunmaker_user');
    if (savedUser) {
      const userObj = JSON.parse(savedUser);
      setCurrentUser(userObj);
      setIsAuthenticated(true);
      fetchProducts(userObj.company_id);
    }

    const savedCompliance = localStorage.getItem('sunmaker_compliance');
    if (savedCompliance) {
      try {
        const parsed = JSON.parse(savedCompliance);
        if (parsed.help) setReadHelp(true);
        if (parsed.terms) setReadTerms(true);
        if (parsed.privacy) setReadPrivacy(true);
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const saveCompliance = (type) => {
    const compliance = {
      help: type === 'help' ? true : readHelp,
      terms: type === 'terms' ? true : readTerms,
      privacy: type === 'privacy' ? true : readPrivacy,
    };
    localStorage.setItem('sunmaker_compliance', JSON.stringify(compliance));
  };

  const handleOpenHelp = () => {
    setReadHelp(true);
    saveCompliance('help');
    setShowHelpModal(true);
  };

  const handleOpenTerms = () => {
    setReadTerms(true);
    saveCompliance('terms');
    setShowTermsModal(true);
  };

  const handleOpenPrivacy = () => {
    setReadPrivacy(true);
    saveCompliance('privacy');
    setShowPrivacyModal(true);
  };

  // --- AUTENTICAÇÃO COM VALIDAÇÃO DE STATUS DA EMPRESA ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!readHelp || !readTerms || !readPrivacy) {
      const pendencias = [];
      if (!readHelp) pendencias.push("Central de ajuda");
      if (!readTerms) pendencias.push("Termos de uso");
      if (!readPrivacy) pendencias.push("Política de privacidade");
      setAuthError(`Acesso bloqueado: é obrigatório abrir e ler os seguintes documentos no rodapé antes de entrar: ${pendencias.join(', ')}.`);
      return;
    }

    const cleanUser = username.trim().toLowerCase();

    // 1. Busca na base de usuários
    const { data: userData } = await supabase
      .from('app_users')
      .select('*')
      .ilike('username', cleanUser)
      .eq('password', password)
      .maybeSingle();

    if (userData) {
      const companyId = userData.company_id || 'empresa-padrao';

      // Validação de status ativo do estabelecimento
      if (companyId !== 'empresa-padrao' && cleanUser !== 'admin') {
        const { data: comp } = await supabase
          .from('companies')
          .select('*')
          .eq('company_id', companyId)
          .maybeSingle();

        if (comp && comp.status === 'bloqueado') {
          setAuthError('Acesso suspenso: este estabelecimento está temporariamente desativado. Contate o suporte.');
          return;
        }
      }

      const userObj = { 
        username: userData.username, 
        role: userData.role || 'operador',
        company_id: companyId,
        avatar_url: userData.avatar_url || null
      };

      localStorage.setItem('sunmaker_user', JSON.stringify(userObj));
      setCurrentUser(userObj);
      setIsAuthenticated(true);
      fetchProducts(companyId);
      return;
    }

    // 2. Acesso Administrador Geral Mestre
    if (cleanUser === 'admin' && password === 'copasul') {
      const adminObj = { username: 'admin', role: 'superadmin', company_id: 'empresa-padrao', avatar_url: null };
      localStorage.setItem('sunmaker_user', JSON.stringify(adminObj));
      setCurrentUser(adminObj);
      setIsAuthenticated(true);
      fetchProducts('empresa-padrao');
      return;
    }

    setAuthError('Usuário ou senha incorretos.');
  };

  const handleLogout = () => {
    localStorage.removeItem('sunmaker_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUsername('');
    setPassword('');
    setProducts([]);
    setShowSettingsModal(false);
  };

  // --- CONSULTAS E AÇÕES B2B (EXCLUSIVO SUPER ADMIN) ---
  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
    if (data) setCompaniesList(data);
  };

  const handleCreateCompanyB2B = async (e) => {
    e.preventDefault();
    const cleanName = newCompanyName.trim();
    let cleanSlug = newCompanySlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const cleanAdmin = newCompanyAdminUser.trim().toLowerCase();
    const cleanPass = newCompanyAdminPass.trim();

    if (!cleanName || cleanName.length < 3) {
      alert("Informe um nome de empresa válido.");
      return;
    }

    if (!cleanSlug) {
      cleanSlug = cleanName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    if (!cleanAdmin || cleanPass.length < 4) {
      alert("Informe um login de administrador e uma senha de no mínimo 4 dígitos.");
      return;
    }

    // 1. Cadastra a empresa
    const { error: compError } = await supabase.from('companies').insert([
      {
        company_id: cleanSlug,
        company_name: cleanName,
        contact_phone: newCompanyPhone.trim(),
        status: 'ativo'
      }
    ]);

    if (compError) {
      alert("Erro ao cadastrar empresa: " + (compError.code === '23505' ? 'Identificador já em uso.' : compError.message));
      return;
    }

    // 2. Cadastra o administrador inicial daquela empresa
    const { error: userError } = await supabase.from('app_users').insert([
      {
        username: cleanAdmin,
        password: cleanPass,
        role: 'admin',
        company_id: cleanSlug
      }
    ]);

    if (userError) {
      alert("Empresa cadastrada, mas houve erro ao criar o usuário: " + userError.message);
    } else {
      alert(`Empresa "${cleanName}" e administrador "${cleanAdmin}" cadastrados com sucesso.`);
      setNewCompanyName('');
      setNewCompanySlug('');
      setNewCompanyPhone('');
      setNewCompanyAdminUser('');
      setNewCompanyAdminPass('');
      fetchCompanies();
    }
  };

  const handleToggleCompanyStatus = async (id, currentStatus, compName) => {
    const nextStatus = currentStatus === 'ativo' ? 'bloqueado' : 'ativo';
    const confirmMsg = nextStatus === 'bloqueado'
      ? `Deseja bloquear o acesso de todos os operadores da empresa "${compName}"?`
      : `Deseja reativar o acesso da empresa "${compName}"?`;

    if (!window.confirm(confirmMsg)) return;

    await supabase.from('companies').update({ status: nextStatus }).eq('id', id);
    fetchCompanies();
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxSize = 180;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

        const updatedUser = { ...currentUser, avatar_url: compressedBase64 };
        setCurrentUser(updatedUser);
        localStorage.setItem('sunmaker_user', JSON.stringify(updatedUser));

        try {
          await supabase
            .from('app_users')
            .update({ avatar_url: compressedBase64 })
            .ilike('username', currentUser.username)
            .eq('company_id', currentUser.company_id);
        } catch (err) {
          console.error("Erro ao atualizar foto de perfil:", err);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, avatar_url: null };
    setCurrentUser(updatedUser);
    localStorage.setItem('sunmaker_user', JSON.stringify(updatedUser));

    try {
      await supabase
        .from('app_users')
        .update({ avatar_url: null })
        .ilike('username', currentUser.username)
        .eq('company_id', currentUser.company_id);
    } catch (err) {
      console.error("Erro ao remover foto:", err);
    }
  };

  const fetchProducts = async (companyId) => {
    const targetCompany = companyId || currentUser?.company_id;
    if (!targetCompany) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', targetCompany)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    if (!currentUser?.company_id) return;
    const { data } = await supabase
      .from('app_users')
      .select('*')
      .eq('company_id', currentUser.company_id)
      .order('created_at', { ascending: false });

    if (data) setUsersList(data);
  };

  const handleCreateNewUser = async (e) => {
    e.preventDefault();
    const cleanUser = newUserName.trim().toLowerCase();
    if (!cleanUser || !newUserPass || !currentUser?.company_id) return;

    const { error } = await supabase.from('app_users').insert([
      { 
        username: cleanUser, 
        password: newUserPass, 
        role: newUserRole, 
        company_id: currentUser.company_id 
      }
    ]);

    if (error) {
      alert("Erro ao cadastrar: " + (error.code === '23505' ? 'Nome de usuário já existe.' : error.message));
    } else {
      alert(`Usuário "${cleanUser}" cadastrado com sucesso.`);
      setNewUserName('');
      setNewUserPass('');
      fetchUsers();
    }
  };

  const handleUpdateUserPassword = async (id, targetUser) => {
    if (!updatedPasswordValue || updatedPasswordValue.trim().length < 4 || !currentUser?.company_id) {
      alert("A nova senha deve ter no mínimo 4 caracteres.");
      return;
    }

    const { error } = await supabase
      .from('app_users')
      .update({ password: updatedPasswordValue })
      .eq('id', id)
      .eq('company_id', currentUser.company_id);

    if (error) {
      alert("Erro ao alterar senha: " + error.message);
    } else {
      alert(`Senha do usuário "${targetUser}" redefinida com sucesso.`);
      setEditingPasswordUserId(null);
      setUpdatedPasswordValue('');
      fetchUsers();
    }
  };

  const handleDeleteUser = async (id, userToDelete) => {
    if (userToDelete === 'admin') {
      alert("Não é permitido excluir o administrador padrão.");
      return;
    }
    if (!currentUser?.company_id) return;
    if (!window.confirm(`Confirma a remoção do acesso de "${userToDelete}"?`)) return;

    await supabase
      .from('app_users')
      .delete()
      .eq('id', id)
      .eq('company_id', currentUser.company_id);

    fetchUsers();
  };

  const handleSetPrice = async (id, priceValue) => {
    const rawPrice = String(priceValue).replace('R$', '').replace(/\s/g, '').replace(',', '.');
    const price = parseFloat(rawPrice);
    if (isNaN(price) || price <= 0 || !currentUser?.company_id) return;

    const product = products.find(p => p.id === id);
    if (!product) return;

    const cost = Number(product.cost) || 0;
    if (cost <= 0) return;

    let margin = 0;
    if (calculationMode === 'markup') {
      margin = ((price - cost) / cost) * 100;
    } else {
      margin = ((price - cost) / price) * 100;
    }
    margin = Math.round(margin * 1000) / 1000;

    setProducts(products.map(p => p.id === id ? { ...p, margin, is_new: false } : p));

    if (typeof id === 'string' && !id.startsWith('local-')) {
      await supabase
        .from('products')
        .update({ margin, is_new: false })
        .eq('id', id)
        .eq('company_id', currentUser.company_id);
    }
  };

  const handleSetMargin = async (id, marginValue) => {
    const margin = parseFloat(marginValue);
    if (isNaN(margin) || !currentUser?.company_id) return;
    
    setProducts(products.map(p => p.id === id ? { ...p, margin, is_new: false } : p));
    
    if (typeof id === 'string' && !id.startsWith('local-')) {
      await supabase
        .from('products')
        .update({ margin, is_new: false })
        .eq('id', id)
        .eq('company_id', currentUser.company_id);
    }
  };

  const handleRemoveMargin = async (id) => {
    if (!currentUser?.company_id) return;
    setProducts(products.map(p => p.id === id ? { ...p, margin: null } : p));
    if (typeof id === 'string' && !id.startsWith('local-')) {
      await supabase
        .from('products')
        .update({ margin: null })
        .eq('id', id)
        .eq('company_id', currentUser.company_id);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!currentUser?.company_id) return;
    if (!window.confirm('Tem certeza de que deseja excluir este item?')) return;
    
    setProducts(products.filter(p => p.id !== id));
    
    if (typeof id === 'string' && !id.startsWith('local-')) {
      await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('company_id', currentUser.company_id);
    }
  };

  const handleClearAllData = async () => {
    if (!currentUser?.company_id) return;
    const confirm = window.confirm('ATENÇÃO: Deseja apagar todos os produtos cadastrados da sua empresa?');
    
    if (confirm) {
      setUploading(true);
      setUploadProgress('Limpando banco de dados...');
      setProducts([]);

      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('company_id', currentUser.company_id);

        if (error) {
          alert("Erro: " + error.message);
          fetchProducts(currentUser.company_id); 
        } else {
          alert("Base de dados da sua empresa limpa com sucesso.");
        }
      } catch (err) {
        fetchProducts(currentUser.company_id);
      }
      
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleApplyCustomMarginAll = async () => {
    const margin = parseFloat(globalMarginValue);
    if (isNaN(margin) || margin <= 0 || products.length === 0 || !currentUser?.company_id) {
      alert("Por favor, informe uma porcentagem de margem válida maior que zero.");
      return;
    }

    const confirm = window.confirm(
      `Deseja aplicar a margem de ${margin}% em todos os ${products.length} produtos cadastrados da sua empresa?`
    );
    if (!confirm) return;

    setUploading(true);
    setUploadProgress(`Aplicando ${margin}% em todos os produtos...`);

    setProducts(products.map(p => ({ ...p, margin, is_new: false })));

    try {
      const { error } = await supabase
        .from('products')
        .update({ margin, is_new: false })
        .eq('company_id', currentUser.company_id);

      if (error) {
        const idsToUpdate = products
          .filter(p => typeof p.id === 'string' && !p.id.startsWith('local-'))
          .map(p => p.id);
        
        for (let i = 0; i < idsToUpdate.length; i += 200) {
          const batchIds = idsToUpdate.slice(i, i + 200);
          await supabase
            .from('products')
            .update({ margin, is_new: false })
            .in('id', batchIds)
            .eq('company_id', currentUser.company_id);
        }
      }

      alert(`Margem de ${margin}% aplicada com sucesso em todos os ${products.length} produtos.`);
    } catch (err) {
      console.error("Erro ao aplicar margem global:", err);
      fetchProducts(currentUser.company_id);
    }

    setUploading(false);
    setUploadProgress('');
  };

  const handlePrintPDF = () => {
    setShowSettingsModal(false);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const startEditing = (product) => {
    setEditingId(product.id);
    const cost = Number(product.cost) || 0;
    const marginVal = product.margin !== null ? Number(product.margin) : 0;
    
    let currentPrice = '';
    if (marginVal > 0 && cost > 0) {
      if (calculationMode === 'markup') {
        currentPrice = (cost + (cost * (marginVal / 100))).toFixed(2);
      } else {
        currentPrice = (marginVal < 100 ? cost / (1 - (marginVal / 100)) : cost + (cost * (marginVal / 100))).toFixed(2);
      }
    }

    setEditForm({
      name: product.name,
      category: product.category || 'Geral',
      stock: product.stock !== undefined && product.stock !== null ? product.stock : 0,
      cost: product.cost,
      margin: product.margin !== null ? product.margin : '',
      price: currentPrice
    });
  };

  const handleEditPriceChange = (val) => {
    const rawPrice = String(val).replace(',', '.');
    const numPrice = parseFloat(rawPrice);
    const numCost = parseFloat(String(editForm.cost).replace(',', '.')) || 0;

    let calcMargin = editForm.margin;
    if (!isNaN(numPrice) && numPrice > 0 && numCost > 0) {
      if (calculationMode === 'markup') {
        calcMargin = (((numPrice - numCost) / numCost) * 100).toFixed(3);
      } else {
        calcMargin = (((numPrice - numCost) / numPrice) * 100).toFixed(3);
      }
    }

    setEditForm(prev => ({ ...prev, price: val, margin: calcMargin }));
  };

  const handleEditMarginChange = (val) => {
    const rawMargin = String(val).replace(',', '.');
    const numMargin = parseFloat(rawMargin);
    const numCost = parseFloat(String(editForm.cost).replace(',', '.')) || 0;

    let calcPrice = editForm.price;
    if (!isNaN(numMargin) && numMargin > 0 && numCost > 0) {
      if (calculationMode === 'markup') {
        calcPrice = (numCost + (numCost * (numMargin / 100))).toFixed(2);
      } else {
        calcPrice = (numMargin < 100 ? numCost / (1 - (numMargin / 100)) : numCost + (numCost * (numMargin / 100))).toFixed(2);
      }
    }

    setEditForm(prev => ({ ...prev, margin: val, price: calcPrice }));
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEditing = async (id) => {
    if (!currentUser?.company_id) return;
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
      await supabase
        .from('products')
        .update({ 
          name: editForm.name, 
          category: editForm.category,
          stock: updatedStock,
          cost: updatedCost, 
          margin: updatedMargin,
          is_new: false
        })
        .eq('id', id)
        .eq('company_id', currentUser.company_id);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser?.company_id) return;
    setUploading(true);
    setUploadProgress('Lendo arquivo CSV...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvText = event.target.result;

      Papa.parse(csvText, {
        skipEmptyLines: true,
        complete: async (results) => {
          const parsedProducts = [];
          let currentGroup = 'Geral';
          
          let detectedMode = 'markup'; 
          const headerRows = results.data.slice(0, 6);
          const headerText = headerRows.map(r => r.join(' ')).join(' ').toLowerCase();
          
          if (headerText.includes('margem mark up') || headerText.includes('markup')) {
             detectedMode = 'markup';
          } else if (headerText.includes('margem de lucro') && !headerText.includes('mark up')) {
             detectedMode = 'margin';
          }
          setCalculationMode(detectedMode);

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
                is_new: true,
                company_id: currentUser.company_id
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
                parsedProducts.push({ 
                  name: String(name).trim(), 
                  category, 
                  stock, 
                  cost, 
                  margin, 
                  is_new: true,
                  company_id: currentUser.company_id 
                });
              });
            }
          }

          if (parsedProducts.length === 0) {
            alert("Nenhum dado compatível encontrado no relatório.");
            setUploading(false);
            setUploadProgress('');
            return;
          }

          const batchSize = 500;
          let successCount = 0;
          let hasError = false;

          for (let i = 0; i < parsedProducts.length; i += batchSize) {
            const batch = parsedProducts.slice(i, i + batchSize);
            setUploadProgress(`Gravando ${i + batch.length} de ${parsedProducts.length}...`);
            
            const { error } = await supabase.from('products').insert(batch);
            
            if (error) {
              console.error("Erro no lote", i, error);
              alert("Erro ao gravar lote de dados: " + error.message);
              hasError = true;
              break;
            }
            successCount += batch.length;
          }

          if (!hasError) {
             alert(`${successCount} produtos importados (${detectedMode === 'markup' ? 'Modo Markup' : 'Modo Margem Real'}).`);
          }
          
          fetchProducts(currentUser.company_id);
          setUploading(false);
          setUploadProgress('');
          e.target.value = '';
        },
        error: () => {
          alert("Erro ao ler o arquivo CSV.");
          setUploading(false);
          setUploadProgress('');
        }
      });
    };

    reader.readAsText(file, "ISO-8859-1");
  };

  const categoriesList = ['todas', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // Filtro Dinâmico: recalcula tudo conforme a categoria e a busca ativa
  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(term) || 
                          (p.category && p.category.toLowerCase().includes(term));
    const matchesCategory = selectedCategory === 'todas' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const productsWithoutMargin = filteredProducts.filter(p => p.margin === null || p.margin === undefined || p.margin === 0);
  const newProducts = filteredProducts.filter(p => p.is_new);

  let totalStockUnits = 0;
  let totalCostInvested = 0;
  let totalStockProfit = 0;
  let totalSalesValue = 0;

  filteredProducts.forEach(p => {
    const stockQty = Number(p.stock) || 0;
    const cost = Number(p.cost) || 0;
    totalStockUnits += stockQty;
    totalCostInvested += cost * stockQty;

    if (p.margin !== null && p.margin !== undefined && p.margin > 0) {
      const marginVal = Number(p.margin);
      let suggestedPrice = 0;
      let unitProfit = 0;

      if (calculationMode === 'markup') {
        suggestedPrice = cost + (cost * (marginVal / 100));
      } else {
        if (marginVal < 100) {
          suggestedPrice = cost / (1 - (marginVal / 100));
        } else {
          suggestedPrice = cost + (cost * (marginVal / 100));
        }
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

  // ==========================================
  // TELA DE LOGIN B2B (SEM CADASTRO PÚBLICO)
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div 
        className="min-h-screen w-full flex items-center justify-start p-6 md:p-16 lg:p-24 relative bg-cover bg-center"
        style={{ backgroundImage: `url("${LOGIN_BG_IMAGE}")` }}
      >
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" />

        <motion.div 
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col justify-between"
        >
          <div className="p-8 pb-6">
            <div className="pb-5 border-b border-gray-200 mb-6">
              <h1 className="text-3xl font-black italic tracking-tighter text-amber-500">
                SunMaker
              </h1>
              <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase mt-0.5">
                Portal de Inteligência Comercial
              </p>
            </div>

            {authError && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium text-center leading-relaxed">
                {authError}
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input 
                  type="text"
                  placeholder="Nome de Usuário"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-100 text-gray-800 text-sm px-4 py-3 rounded-lg outline-none border border-transparent focus:border-amber-500 focus:bg-white transition-all placeholder:text-gray-400 font-medium"
                  required
                />
              </div>

              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Senha de Acesso"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-blue-50/50 text-gray-800 text-sm px-4 py-3 pr-11 rounded-lg outline-none border border-transparent focus:border-amber-500 focus:bg-white transition-all placeholder:text-gray-400 font-medium"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-lg text-sm tracking-wide shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                Acessar
              </button>

              <div className="text-center pt-2">
                <a 
                  href="#" 
                  onClick={(e) => { 
                    e.preventDefault(); 
                    alert("Para redefinir sua credencial ou contratar acessos adicionais, contate o administrador da plataforma."); 
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  Recuperação de senha e suporte
                </a>
              </div>
            </form>
          </div>

          <div className="bg-gray-50/80 p-5 px-8 border-t border-gray-100 space-y-2 text-xs text-gray-600">
            <div 
              onClick={handleOpenHelp}
              className="flex items-center justify-between cursor-pointer hover:text-gray-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle size={14} className="text-gray-400" />
                <span>Central de ajuda</span>
              </div>
              <span className={`text-[10px] font-semibold ${readHelp ? 'text-emerald-600' : 'text-amber-600'}`}>
                {readHelp ? '[Lido]' : '[Pendente]'}
              </span>
            </div>

            <div 
              onClick={handleOpenTerms}
              className="flex items-center justify-between cursor-pointer hover:text-gray-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info size={14} className="text-gray-400" />
                <span>Termos de uso</span>
              </div>
              <span className={`text-[10px] font-semibold ${readTerms ? 'text-emerald-600' : 'text-amber-600'}`}>
                {readTerms ? '[Lido]' : '[Pendente]'}
              </span>
            </div>

            <div 
              onClick={handleOpenPrivacy}
              className="flex items-center justify-between cursor-pointer hover:text-gray-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-gray-400" />
                <span>Política de privacidade</span>
              </div>
              <span className={`text-[10px] font-semibold ${readPrivacy ? 'text-emerald-600' : 'text-amber-600'}`}>
                {readPrivacy ? '[Lido]' : '[Pendente]'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* MODAL CENTRAL DE AJUDA */}
        <AnimatePresence>
          {showHelpModal && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-white"
              >
                <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-black/40">
                  <div className="flex items-center gap-2">
                    <BookOpen className="text-amber-500" size={22} />
                    <h3 className="text-lg font-bold text-white">Central de Ajuda - SunMaker</h3>
                  </div>
                  <button 
                    onClick={() => setShowHelpModal(false)} 
                    className="text-gray-400 hover:text-white p-1 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5 text-sm">
                  <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                    <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1.5">
                      <FileSpreadsheet size={16} />
                      <h4>Como importar relatórios do sistema Xpert</h4>
                    </div>
                    <p className="text-gray-300 text-xs leading-relaxed">
                      1. No sistema de gestão (Xpert ou compatível), emita o relatório de produtos em formato CSV.<br/>
                      2. Acesse o painel do SunMaker e clique em "Upload Relatório" no topo.<br/>
                      3. O sistema processa automaticamente arquivos com milhares de itens em lotes contínuos para a sua empresa.
                    </p>
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1.5">
                      <Calculator size={16} />
                      <h4>Definição de preços e cálculo automático</h4>
                    </div>
                    <p className="text-gray-300 text-xs leading-relaxed">
                      Ao invés de calcular porcentagens de cabeça, digite o preço final de venda (em R$) diretamente na coluna "Definir Preço" da tabela e pressione Enter. O sistema recalcula a margem e o lucro líquido do lote na hora.
                    </p>
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                    <div className="flex items-center gap-2 text-blue-400 font-semibold mb-1.5">
                      <Shield size={16} />
                      <h4>Diferença entre Markup e Margem Real</h4>
                    </div>
                    <p className="text-gray-300 text-xs leading-relaxed">
                      O SunMaker lê os cabeçalhos do arquivo exportado e identifica automaticamente se os dados foram gerados como Markup (acréscimo sobre o custo) ou Margem Real (lucro sobre a venda), garantindo consistência matemática com o sistema do estabelecimento.
                    </p>
                  </div>

                  <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800">
                    <div className="flex items-center gap-2 text-red-400 font-semibold mb-1.5">
                      <PhoneCall size={16} />
                      <h4>Esquecimento de senha e suporte operacional</h4>
                    </div>
                    <p className="text-gray-300 text-xs leading-relaxed">
                      Por motivos de segurança interna, senhas não são redefinidas publicamente. Caso esqueça sua credencial de acesso, solicite a um operador com perfil Administrador para redefinir sua senha diretamente na aba "Usuários" das Configurações.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-neutral-950 border-t border-neutral-800 text-right">
                  <button 
                    onClick={() => setShowHelpModal(false)}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    Confirmar Leitura e Fechar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL TERMOS DE USO */}
        <AnimatePresence>
          {showTermsModal && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-white"
              >
                <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-black/40">
                  <div className="flex items-center gap-2">
                    <Scale className="text-amber-500" size={22} />
                    <h3 className="text-lg font-bold text-white">Termos de Uso - Plataforma SunMaker</h3>
                  </div>
                  <button 
                    onClick={() => setShowTermsModal(false)} 
                    className="text-gray-400 hover:text-white p-1 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4 text-xs leading-relaxed text-gray-300">
                  <div className="border-l-2 border-amber-500 pl-3">
                    <h4 className="text-sm font-bold text-white mb-1">1. Objeto e Finalidade</h4>
                    <p>
                      A plataforma SunMaker é uma ferramenta corporativa de gestão de preços, sincronização de relatórios e análise de rentabilidade comercial. O acesso é restrito a estabelecimentos contratantes e usuários previamente homologados.
                    </p>
                  </div>

                  <div className="border-l-2 border-amber-500 pl-3">
                    <h4 className="text-sm font-bold text-white mb-1">2. Confidencialidade Comercial</h4>
                    <p>
                      Todos os dados contidos na plataforma, incluindo custos de aquisição de produtos, margens praticadas, estoque físico e projeções de lucratividade, constituem informações confidenciais e segredo comercial. É terminantemente proibida a extração ou repasse desses registros para terceiros não autorizados.
                    </p>
                  </div>

                  <div className="border-l-2 border-amber-500 pl-3">
                    <h4 className="text-sm font-bold text-white mb-1">3. Responsabilidade pelas Credenciais</h4>
                    <p>
                      Cada operador é responsável pela segurança de seu login e senha. Quaisquer ações executadas na base de dados serão registradas e vinculadas à conta autenticada no momento da operação.
                    </p>
                  </div>

                  <div className="border-l-2 border-amber-500 pl-3">
                    <h4 className="text-sm font-bold text-white mb-1">4. Integridade das Operações</h4>
                    <p>
                      O usuário compromete-se a conferir a integridade dos relatórios importados e dos valores aplicados na tabela, ciente de que a precificação incorreta reflete diretamente no faturamento e nos resultados financeiros do negócio.
                    </p>
                  </div>

                  <div className="border-l-2 border-amber-500 pl-3">
                    <h4 className="text-sm font-bold text-white mb-1">5. Auditoria e Encerramento de Acesso</h4>
                    <p>
                      A administração reserva-se o direito de monitorar o uso da ferramenta, redefinir senhas, alterar níveis de permissão (Operador ou Administrador) e revogar acessos de usuários inativos, desligados ou com assinaturas suspensas.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex justify-between items-center">
                  <span className="text-[11px] text-gray-500">
                    Termos e Condições Gerais de Uso da Plataforma
                  </span>
                  <button 
                    onClick={() => setShowTermsModal(false)}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    Confirmar Leitura e Fechar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL POLÍTICA DE PRIVACIDADE */}
        <AnimatePresence>
          {showPrivacyModal && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-white"
              >
                <div className="p-6 border-b border-neutral-800 flex justify-between items-center bg-black/40">
                  <div className="flex items-center gap-2">
                    <Lock className="text-amber-500" size={22} />
                    <h3 className="text-lg font-bold text-white">Política de Privacidade - Plataforma SunMaker</h3>
                  </div>
                  <button 
                    onClick={() => setShowPrivacyModal(false)} 
                    className="text-gray-400 hover:text-white p-1 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4 text-xs leading-relaxed text-gray-300">
                  <div className="border-l-2 border-emerald-500 pl-3">
                    <h4 className="text-sm font-bold text-white mb-1">1. Coleta e Tratamento de Dados</h4>
                    <p>
                      A plataforma SunMaker realiza o tratamento mínimo de dados necessários para a operação comercial, coletando exclusivamente nomes de usuário de acesso, perfis de função (Operador ou Administrador), identificador de empresa e metadados de modificação nos registros de estoque e precificação.
                    </p>
                  </div>

                  <div className="border-l-2 border-emerald-500 pl-3">
                    <h4 className="text-sm font-bold text-white mb-1">2. Armazenamento e Segurança da Informação</h4>
                    <p>
                      Todas as informações são armazenadas em infraestrutura de nuvem segura provida pelo Supabase, empregando criptografia em trânsito (protocolo TLS/SSL), isolamento lógico multi-empresa e controles de acesso restritos.
                    </p>
                  </div>

                  <div className="border-l-2 border-emerald-500 pl-3">
                    <h4 className="text-sm font-bold text-white mb-1">3. Não Compartilhamento com Terceiros</h4>
                    <p>
                      Nenhum dado cadastral ou comercial registrado no SunMaker é vendido, alugado, transferido ou compartilhado com plataformas externas para fins publicitários ou comerciais. Os registros pertencem unicamente à administração do estabelecimento contratante.
                    </p>
                  </div>

                  <div className="border-l-2 border-emerald-500 pl-3">
                    <h4 className="text-sm font-bold text-white mb-1">4. Conformidade com a Legislação (LGPD)</h4>
                    <p>
                      Em estrito cumprimento à Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018), os usuários têm o direito de confirmar a existência de tratamento de seus dados e solicitar retificações mediante solicitação formal ao gestor da plataforma.
                    </p>
                  </div>

                  <div className="border-l-2 border-emerald-500 pl-3">
                    <h4 className="text-sm font-bold text-white mb-1">5. Retenção de Dados e Histórico Operacional</h4>
                    <p>
                      Os registros operacionais e históricos de preços permanecem armazenados pelo período necessário para atender a auditorias financeiras internas, cumprimento de obrigações tributárias e avaliação do ciclo comercial da empresa.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-neutral-950 border-t border-neutral-800 flex justify-between items-center">
                  <span className="text-[11px] text-gray-500">
                    Diretrizes de Privacidade e Proteção de Dados Pessoais
                  </span>
                  <button 
                    onClick={() => setShowPrivacyModal(false)}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    Confirmar Leitura e Fechar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ==========================================
  // DASHBOARD PRINCIPAL
  // ==========================================
  return (
    <div className="p-8 max-w-7xl mx-auto font-sans text-white">
      {/* CABEÇALHO */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 border-b border-gray-800 pb-6 no-print">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black tracking-tighter text-amber-500 flex items-center gap-2"
          >
            SunMaker
          </motion.h1>
          <p className="text-gray-400 mt-1 text-sm">
            Dashboard de Inteligência
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Pesquisa */}
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

          {/* Categorias */}
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

          {/* Upload do Relatório */}
          <label className="cursor-pointer bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-medium">
            <Upload size={16} />
            <span>{uploading && uploadProgress !== '' ? uploadProgress : "Upload Relatório"}</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>

          {/* Botão Central de Configurações */}
          <button 
            onClick={() => { 
              fetchUsers(); 
              if (isSuperAdmin) fetchCompanies();
              setShowSettingsModal(true); 
            }}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all text-sm cursor-pointer"
            title="Abrir Central de Configurações"
          >
            {currentUser?.avatar_url ? (
              <img 
                src={currentUser.avatar_url} 
                alt="Avatar" 
                className="w-5 h-5 rounded-full object-cover border border-amber-500/50"
              />
            ) : (
              <Settings size={16} />
            )}
            Configurações
          </button>

          {/* Botão Sair */}
          <button 
            onClick={handleLogout}
            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-gray-300 font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all text-sm cursor-pointer"
            title="Encerrar sessão"
          >
            <LogOut size={16} className="text-gray-400" />
            Sair
          </button>
        </div>
      </header>

      {/* MODAL CENTRAL DE CONFIGURAÇÕES */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[88vh]"
            >
              <div className="w-full md:w-56 bg-neutral-950 p-4 border-b md:border-b-0 md:border-r border-neutral-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 pb-4 mb-3 border-b border-neutral-800 text-white font-bold text-sm">
                    <Settings className="text-amber-500" size={18} />
                    <span>Configurações</span>
                  </div>

                  <nav className="space-y-1">
                    <button
                      onClick={() => setActiveSettingsTab('usuarios')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${activeSettingsTab === 'usuarios' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:bg-neutral-900 hover:text-white'}`}
                    >
                      <Users size={15} />
                      Usuários
                    </button>

                    <button
                      onClick={() => setActiveSettingsTab('exportacao')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${activeSettingsTab === 'exportacao' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:bg-neutral-900 hover:text-white'}`}
                    >
                      <Download size={15} />
                      Exportação
                    </button>

                    <button
                      onClick={() => setActiveSettingsTab('margens')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${activeSettingsTab === 'margens' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:bg-neutral-900 hover:text-white'}`}
                    >
                      <Sliders size={15} />
                      Margens e Regras
                    </button>

                    <button
                      onClick={() => setActiveSettingsTab('empresa')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${activeSettingsTab === 'empresa' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:bg-neutral-900 hover:text-white'}`}
                    >
                      <Building2 size={15} />
                      Empresa e Conta
                    </button>

                    {/* ABA EXCLUSIVA DO SUPER ADMINISTRADOR */}
                    {isSuperAdmin && (
                      <button
                        onClick={() => { setActiveSettingsTab('empresas'); fetchCompanies(); }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${activeSettingsTab === 'empresas' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'text-blue-400/80 hover:bg-neutral-900 hover:text-blue-300'}`}
                      >
                        <Shield size={15} />
                        Gestão de Empresas
                      </button>
                    )}
                  </nav>
                </div>

                <div className="pt-4 mt-4 border-t border-neutral-800 text-[11px] text-gray-500">
                  SunMaker v1.2
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center pb-4 mb-5 border-b border-neutral-800">
                    <h3 className="text-base font-bold text-white capitalize">
                      {activeSettingsTab === 'usuarios' && "Gerenciamento de Usuários e Logins"}
                      {activeSettingsTab === 'exportacao' && "Exportação e Relatórios"}
                      {activeSettingsTab === 'margens' && "Regras de Margem e Base de Dados"}
                      {activeSettingsTab === 'empresa' && "Informações da Empresa e Sessão"}
                      {activeSettingsTab === 'empresas' && "Gestão Central de Clientes e Empresas (B2B)"}
                    </h3>
                    <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-white p-1 rounded-lg cursor-pointer">
                      <X size={18} />
                    </button>
                  </div>

                  {/* ABA: USUÁRIOS */}
                  {activeSettingsTab === 'usuarios' && (
                    <div className="space-y-6">
                      <form onSubmit={handleCreateNewUser} className="bg-black/40 border border-neutral-800 p-4 rounded-xl space-y-3">
                        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                          <UserPlus size={14} className="text-emerald-400" />
                          Cadastrar Novo Acesso
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input 
                            type="text" 
                            placeholder="Login (Ex: caixa1, gerente)" 
                            value={newUserName}
                            onChange={(e) => setNewUserName(e.target.value)}
                            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                            required
                          />
                          <input 
                            type="password" 
                            placeholder="Senha" 
                            value={newUserPass}
                            onChange={(e) => setNewUserPass(e.target.value)}
                            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                            required
                          />
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <select
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value)}
                            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 outline-none cursor-pointer"
                          >
                            <option value="operador">Perfil: Operador</option>
                            <option value="admin">Perfil: Administrador</option>
                          </select>

                          <button 
                            type="submit"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            Salvar Novo Login
                          </button>
                        </div>
                      </form>

                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Logins Cadastrados ({usersList.length})
                        </p>
                        <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                          {usersList.map(u => (
                            <div key={u.id} className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-sm font-semibold text-white flex items-center gap-2">
                                    {u.username}
                                    <span className="text-[10px] bg-neutral-800 text-gray-400 px-2 py-0.5 rounded capitalize">
                                      {u.role || 'operador'}
                                    </span>
                                  </p>
                                  <p className="text-[11px] text-gray-500">
                                    Cadastrado em: {new Date(u.created_at).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button 
                                    onClick={() => {
                                      if (editingPasswordUserId === u.id) {
                                        setEditingPasswordUserId(null);
                                        setUpdatedPasswordValue('');
                                      } else {
                                        setEditingPasswordUserId(u.id);
                                        setUpdatedPasswordValue('');
                                      }
                                    }}
                                    className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded transition-colors cursor-pointer"
                                    title="Redefinir senha deste usuário"
                                  >
                                    <Key size={16} />
                                  </button>
                                  {u.username !== 'admin' && (
                                    <button 
                                      onClick={() => handleDeleteUser(u.id, u.username)}
                                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                                      title="Remover acesso deste usuário"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {editingPasswordUserId === u.id && (
                                <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center gap-2">
                                  <input 
                                    type="password"
                                    placeholder="Nova senha (min. 4 dígitos)"
                                    value={updatedPasswordValue}
                                    onChange={(e) => setUpdatedPasswordValue(e.target.value)}
                                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-xs text-white outline-none focus:border-amber-500"
                                  />
                                  <button
                                    onClick={() => handleUpdateUserPassword(u.id, u.username)}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    onClick={() => { setEditingPasswordUserId(null); setUpdatedPasswordValue(''); }}
                                    className="bg-neutral-800 hover:bg-neutral-700 text-gray-400 px-2.5 py-1 rounded text-xs transition-all cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ABA: GESTÃO DE EMPRESAS B2B (SUPER ADMIN) */}
                  {activeSettingsTab === 'empresas' && isSuperAdmin && (
                    <div className="space-y-6">
                      <form onSubmit={handleCreateCompanyB2B} className="bg-black/40 border border-neutral-800 p-4 rounded-xl space-y-3">
                        <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Building2 size={14} />
                          Cadastrar Novo Estabelecimento / Cliente
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input 
                            type="text" 
                            placeholder="Nome Fantasia (Ex: Supermercado Sol)" 
                            value={newCompanyName}
                            onChange={(e) => setNewCompanyName(e.target.value)}
                            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                            required
                          />
                          <input 
                            type="text" 
                            placeholder="Identificador Único (Ex: super-sol)" 
                            value={newCompanySlug}
                            onChange={(e) => setNewCompanySlug(e.target.value)}
                            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500 font-mono text-xs"
                          />
                          <input 
                            type="text" 
                            placeholder="WhatsApp / Contato" 
                            value={newCompanyPhone}
                            onChange={(e) => setNewCompanyPhone(e.target.value)}
                            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <input 
                            type="text" 
                            placeholder="Login Inicial do Gerente (Ex: gerentesol)" 
                            value={newCompanyAdminUser}
                            onChange={(e) => setNewCompanyAdminUser(e.target.value)}
                            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                            required
                          />
                          <input 
                            type="password" 
                            placeholder="Senha Inicial de Acesso (min. 4 dígitos)" 
                            value={newCompanyAdminPass}
                            onChange={(e) => setNewCompanyAdminPass(e.target.value)}
                            className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                            required
                          />
                        </div>

                        <div className="text-right pt-1">
                          <button 
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all cursor-pointer"
                          >
                            Ativar Nova Empresa e Criar Acesso
                          </button>
                        </div>
                      </form>

                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Empresas Registradas no Sistema ({companiesList.length})
                        </p>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                          {companiesList.map(comp => (
                            <div key={comp.id} className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex justify-between items-center">
                              <div>
                                <p className="text-sm font-semibold text-white flex items-center gap-2">
                                  {comp.company_name}
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${comp.status === 'ativo' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-red-950 text-red-400 border border-red-900'}`}>
                                    {comp.status || 'ativo'}
                                  </span>
                                </p>
                                <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                                  ID: {comp.company_id} {comp.contact_phone ? `| Contato: ${comp.contact_phone}` : ''}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleCompanyStatus(comp.id, comp.status, comp.company_name)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${comp.status === 'ativo' ? 'bg-red-950/60 hover:bg-red-900 text-red-400' : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-400'}`}
                                >
                                  {comp.status === 'ativo' ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                                  {comp.status === 'ativo' ? 'Suspender' : 'Reativar'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ABA: EXPORTAÇÃO */}
                  {activeSettingsTab === 'exportacao' && (
                    <div className="space-y-5 text-sm">
                      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                        <div className="flex items-center gap-2 text-amber-400 font-semibold">
                          <Printer size={18} />
                          <h4>Relatório Operacional em PDF</h4>
                        </div>
                        <p className="text-gray-300 text-xs leading-relaxed">
                          O arquivo PDF consolida os produtos exibidos na tela, discriminando o estoque físico atual, custo unitário, margem calculada e valor sugerido de venda de acordo com os filtros de busca aplicados.
                        </p>
                        <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                          <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                            <span className="text-gray-500 block">Itens no Relatório:</span>
                            <span className="font-bold text-white text-sm">{filteredProducts.length} itens</span>
                          </div>
                          <div className="bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                            <span className="text-gray-500 block">Estoque Total:</span>
                            <span className="font-bold text-white text-sm">{totalStockUnits.toLocaleString('pt-BR')} unidades</span>
                          </div>
                        </div>

                        <button 
                          onClick={handlePrintPDF}
                          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer"
                        >
                          <Download size={15} />
                          Gerar e Baixar PDF Agora
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ABA: MARGENS E REGRAS */}
                  {activeSettingsTab === 'margens' && (
                    <div className="space-y-5 text-sm">
                      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3">
                        <div className="flex items-center gap-2 text-amber-400 font-semibold">
                          <Zap size={18} />
                          <h4>Aplicação de Margem Global em Massa</h4>
                        </div>
                        <p className="text-gray-300 text-xs leading-relaxed">
                          Defina uma margem padrão para atualizar simultaneamente todos os produtos da sua empresa no banco de dados.
                        </p>
                        
                        <div className="flex items-center gap-3 pt-1">
                          <div className="flex items-center bg-black border border-neutral-700 rounded-lg px-3 py-1.5 focus-within:border-amber-500">
                            <span className="text-gray-400 text-xs mr-2 font-semibold">%</span>
                            <input 
                              type="number"
                              step="0.1"
                              value={globalMarginValue}
                              onChange={(e) => setGlobalMarginValue(e.target.value)}
                              className="w-20 bg-transparent text-sm text-white outline-none font-bold"
                            />
                          </div>

                          <button
                            onClick={handleApplyCustomMarginAll}
                            disabled={uploading || products.length === 0}
                            className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-4 py-2 rounded-lg text-xs transition-all disabled:opacity-40 cursor-pointer"
                          >
                            Aplicar em Todos
                          </button>

                          <button
                            onClick={() => { setGlobalMarginValue('50'); }}
                            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-gray-300 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer"
                          >
                            50% Padrão
                          </button>
                        </div>
                      </div>

                      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                        <div className="flex items-center gap-2 text-blue-400 font-semibold">
                          <Calculator size={18} />
                          <h4>Modo de Precificação Ativo</h4>
                        </div>
                        <p className="text-gray-300 text-xs leading-relaxed">
                          Modo detectado pelo relatório: <strong className="text-amber-400 uppercase">{calculationMode === 'markup' ? 'Markup (Acréscimo sobre custo)' : 'Margem Real (Lucro sobre venda)'}</strong>.
                        </p>
                      </div>

                      <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-red-400 font-semibold">
                          <Trash2 size={16} />
                          <h4>Limpeza de Dados da Empresa</h4>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed">
                          Esta ação excluirá permanentemente todos os produtos cadastrados da sua empresa, mantendo intactos os usuários e os dados de outros estabelecimentos.
                        </p>
                        <button
                          onClick={handleClearAllData}
                          disabled={uploading || products.length === 0}
                          className="bg-red-900 hover:bg-red-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-40 cursor-pointer"
                        >
                          Limpar Todos os Produtos
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ABA: EMPRESA E CONTA */}
                  {activeSettingsTab === 'empresa' && (
                    <div className="space-y-4 text-xs">
                      <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                            <Building2 size={18} />
                            <h4>Identificação da Conta</h4>
                          </div>

                          <div className="flex flex-col items-center">
                            <div className="relative group">
                              <div className="w-16 h-16 rounded-full overflow-hidden bg-neutral-900 border-2 border-amber-500/60 shadow-lg flex items-center justify-center">
                                {currentUser?.avatar_url ? (
                                  <img 
                                    src={currentUser.avatar_url} 
                                    alt="Foto de Perfil" 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-2xl font-black text-amber-500 uppercase">
                                    {currentUser?.username ? currentUser.username.charAt(0) : <User size={24} />}
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={() => avatarInputRef.current?.click()}
                                className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-semibold cursor-pointer"
                                title="Alterar foto de perfil"
                              >
                                <Camera size={16} />
                                <span>Alterar</span>
                              </button>

                              <input 
                                type="file" 
                                accept="image/*" 
                                ref={avatarInputRef} 
                                onChange={handleAvatarUpload} 
                                className="hidden" 
                              />
                            </div>

                            <div className="flex items-center gap-2 mt-1.5">
                              <button
                                onClick={() => avatarInputRef.current?.click()}
                                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                              >
                                {currentUser?.avatar_url ? 'Alterar foto' : 'Adicionar foto'}
                              </button>
                              {currentUser?.avatar_url && (
                                <button
                                  onClick={handleRemoveAvatar}
                                  className="text-[11px] text-red-400 hover:text-red-300 font-medium cursor-pointer"
                                >
                                  Remover
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 text-gray-300 pt-1">
                          <div className="flex justify-between py-1 border-b border-neutral-900">
                            <span className="text-gray-500">Usuário Conectado:</span>
                            <span className="font-semibold text-white">{currentUser?.username}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-neutral-900">
                            <span className="text-gray-500">Perfil de Acesso:</span>
                            <span className="font-semibold text-amber-400 capitalize">{currentUser?.role}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-neutral-900">
                            <span className="text-gray-500">Identificador da Empresa:</span>
                            <span className="font-mono text-blue-400 font-semibold">{currentUser?.company_id}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-gray-500">Status da Sessão:</span>
                            <span className="text-emerald-400 font-semibold">Ativa e Autenticada</span>
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            onClick={handleLogout}
                            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-gray-300 font-medium px-4 py-2 rounded-lg text-xs flex items-center gap-2 transition-all cursor-pointer"
                          >
                            <LogOut size={14} className="text-gray-400" />
                            Encerrar Sessão Desta Conta
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-neutral-800 text-right mt-6">
                  <button 
                    onClick={() => setShowSettingsModal(false)}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ESTIMATIVA DE PERÍODO (CALCULADA PELA CATEGORIA ATIVA) */}
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
            Projeção Estimada de Lucro ({period}) {selectedCategory !== 'todas' ? `- ${selectedCategory}` : ''}:
          </p>
          <p className="text-2xl font-black text-emerald-400">
            R$ {getPeriodProfit().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-gray-500">Calculado sobre a rotatividade dos itens exibidos</span>
        </div>
      </motion.div>

      {/* CARDS DE RESUMO FINANCEIRO (VINCULADOS AO FILTRO ATIVO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 no-print">
        <motion.div whileHover={{ scale: 1.02 }} className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-400 font-medium text-xs uppercase tracking-wider">Produtos / Itens</h3>
            <Package className="text-amber-500" size={20} />
          </div>
          <p className="text-3xl font-bold">{filteredProducts.length}</p>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Boxes size={14} className="text-neutral-500" />
            <span className="text-amber-400 font-semibold">{totalStockUnits.toLocaleString('pt-BR')}</span> unidades {selectedCategory !== 'todas' ? 'na categoria' : 'em loja'}
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
          <p className="text-xs text-gray-500 mt-1">Custo dos itens exibidos</p>
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
            Venda estimada: <strong className="text-gray-300">R$ {totalSalesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
          </p>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02 }} className="bg-neutral-900 p-5 rounded-2xl border border-red-950/70 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-red-400 font-medium text-xs uppercase tracking-wider">Revisar Margem</h3>
            <AlertCircle className="text-red-500" size={20} />
          </div>
          <p className="text-3xl font-bold text-red-500">{productsWithoutMargin.length}</p>
          <p className="text-xs text-gray-500 mt-1">Itens sem margem no filtro ativo</p>
        </motion.div>
      </div>

      {/* LISTAGEM DE PRODUTOS */}
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
                <th className="p-4 no-print text-center">Definir Preço</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 italic">
                    Nenhum produto cadastrado para a sua empresa nesta categoria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  const isEditing = editingId === product.id;
                  const stockQty = Number(product.stock) || 0;
                  const cost = Number(product.cost) || 0;
                  const marginVal = product.margin !== null ? Number(product.margin) : 0;
                  
                  let suggestedPrice = 0;
                  let unitProfit = 0;

                  if (marginVal > 0) {
                    if (calculationMode === 'markup') {
                      suggestedPrice = cost + (cost * (marginVal / 100));
                    } else {
                      if (marginVal < 100) {
                        suggestedPrice = cost / (1 - (marginVal / 100));
                      } else {
                        suggestedPrice = cost + (cost * (marginVal / 100));
                      }
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
                            {(!product.margin || product.margin === 0) && (
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
                            className="w-20 bg-black border border-amber-500/70 rounded px-2.5 py-1 text-sm text-center outline-none"
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
                            step="0.001"
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
                            onChange={(e) => handleEditMarginChange(e.target.value)}
                            placeholder="%"
                            className="w-20 bg-black border border-amber-500/70 rounded px-2.5 py-1 text-sm outline-none"
                          />
                        ) : (
                          marginVal > 0 ? (
                            <span className="text-amber-400 font-bold">{marginVal}%</span>
                          ) : (
                            <span className="text-gray-500 italic">0%</span>
                          )
                        )}
                      </td>
                      
                      <td className="p-4 font-mono text-sm">
                        {isEditing ? (
                          <div className="flex items-center bg-black border border-emerald-500/70 rounded px-2.5 py-1">
                            <span className="text-gray-400 text-xs mr-1">R$</span>
                            <input 
                              type="number" 
                              step="0.01"
                              value={editForm.price} 
                              onChange={(e) => handleEditPriceChange(e.target.value)}
                              placeholder="0.00"
                              className="w-20 bg-transparent text-sm text-emerald-400 font-semibold outline-none"
                            />
                          </div>
                        ) : (
                          marginVal > 0
                            ? <span className="text-gray-200">R$ {suggestedPrice.toFixed(2)}</span>
                            : <span className="text-gray-600">-</span>
                        )}
                      </td>

                      <td className="p-4 font-mono text-sm font-semibold">
                        {!isEditing && marginVal > 0
                          ? <span className="text-emerald-400">R$ {lotProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          : <span className="text-gray-600">-</span>
                        }
                      </td>
                      
                      <td className="p-4 no-print">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => saveEditing(product.id)} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded cursor-pointer" title="Confirmar">
                              <Check size={18} />
                            </button>
                            <button onClick={cancelEditing} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded cursor-pointer" title="Cancelar">
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex items-center bg-black border border-neutral-700 rounded px-2 py-1 focus-within:border-amber-500 transition-colors" title="Digite o Preço Sugerido em R$ e aperte Enter">
                              <span className="text-gray-500 text-xs mr-1 font-semibold">R$</span>
                              <input 
                                type="number" 
                                step="0.01"
                                placeholder="0,00" 
                                className="w-16 bg-transparent text-sm outline-none text-white placeholder:text-gray-600 font-mono"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSetPrice(product.id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                                onBlur={(e) => {
                                  if (e.target.value) {
                                    handleSetPrice(product.id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </div>

                            <button 
                              onClick={() => startEditing(product)} 
                              className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-colors cursor-pointer" 
                              title="Editar Dados"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button 
                              onClick={() => handleRemoveMargin(product.id)} 
                              className="p-1.5 text-gray-400 hover:text-orange-400 hover:bg-orange-400/10 rounded transition-colors cursor-pointer" 
                              title="Zerar Margem"
                            >
                              <AlertCircle size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(product.id)} 
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors cursor-pointer" 
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
