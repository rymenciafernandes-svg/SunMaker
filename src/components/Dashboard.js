import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, Download, Trash2, TrendingUp, AlertCircle, Package, 
  Edit3, X, Check, Search, Filter, DollarSign, Boxes, Zap, 
  Eye, EyeOff, HelpCircle, Info, FileText, LogOut, Users, UserPlus, Shield, Key,
  BookOpen, Calculator, FileSpreadsheet, PhoneCall, Scale, Lock, Building2,
  Settings, Sliders, Printer, Camera, User, ToggleLeft, ToggleRight, ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';

const LOGIN_BG_IMAGE = "https://images.unsplash.com/photo-1545459720-aac8509eb02c?q=80&w=1920&auto=format&fit=crop"; 

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Escopo de empresa ativa para visualização do Admin
  const [activeCompanyScope, setActiveCompanyScope] = useState('conveniencia-copasul');
  const [impersonatedOperator, setImpersonatedOperator] = useState(null);
  const [adminInsideNotification, setAdminInsideNotification] = useState(null);

  // Modal para escolher operador da empresa
  const [showCompanyUsersModal, setShowCompanyUsersModal] = useState(false);
  const [selectedCompanyForImpersonation, setSelectedCompanyForImpersonation] = useState(null);
  const [companyOperatorsList, setCompanyOperatorsList] = useState([]);

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

  // Configurações - Gestão B2B de Empresas
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
  const effectiveCompanyId = isSuperAdmin ? activeCompanyScope : (currentUser?.company_id || 'conveniencia-copasul');

  useEffect(() => {
    const savedUser = localStorage.getItem('sunmaker_user');
    if (savedUser) {
      try {
        const userObj = JSON.parse(savedUser);
        setCurrentUser(userObj);
        setIsAuthenticated(true);

        const target = (userObj.username === 'admin' || userObj.role === 'superadmin')
          ? (localStorage.getItem('sunmaker_active_company') || 'conveniencia-copasul')
          : (userObj.company_id || 'conveniencia-copasul');

        setActiveCompanyScope(target);
        fetchProducts(target);
      } catch (err) {
        console.error(err);
      }
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

  // Heartbeat de Presença (Online/Offline) e Alerta de Suporte
  useEffect(() => {
    if (!isAuthenticated || !currentUser || isSuperAdmin) return;

    const pingActivity = async () => {
      try {
        await supabase
          .from('app_users')
          .update({ last_seen_at: new Date().toISOString() })
          .ilike('username', currentUser.username)
          .eq('company_id', currentUser.company_id);

        const { data } = await supabase
          .from('app_users')
          .select('active_support_by')
          .ilike('username', currentUser.username)
          .eq('company_id', currentUser.company_id)
          .maybeSingle();

        if (data && data.active_support_by) {
          setAdminInsideNotification(data.active_support_by);
        } else {
          setAdminInsideNotification(null);
        }
      } catch (err) {
        console.error(err);
      }
    };

    pingActivity();
    const interval = setInterval(pingActivity, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser, isSuperAdmin]);

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

  // --- LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!readHelp || !readTerms || !readPrivacy) {
      const pendencias = [];
      if (!readHelp) pendencias.push("Central de ajuda");
      if (!readTerms) pendencias.push("Termos de uso");
      if (!readPrivacy) pendencias.push("Política de privacidade");
      setAuthError(`Acesso bloqueado: abra e leia os documentos no rodapé antes de entrar: ${pendencias.join(', ')}.`);
      return;
    }

    const cleanUser = username.trim().toLowerCase();

    // 1. Acesso Administrador Geral (Carrega a Copasul e todos os produtos automaticamente)
    if (cleanUser === 'admin' && password === 'copasul') {
      const superAdminObj = { 
        username: 'admin', 
        role: 'superadmin', 
        company_id: 'conveniencia-copasul', 
        avatar_url: null 
      };
      localStorage.setItem('sunmaker_user', JSON.stringify(superAdminObj));
      localStorage.setItem('sunmaker_active_company', 'conveniencia-copasul');
      setCurrentUser(superAdminObj);
      setActiveCompanyScope('conveniencia-copasul');
      setImpersonatedOperator(null);
      setIsAuthenticated(true);
      fetchProducts('conveniencia-copasul');
      return;
    }

    // 2. Acesso de Usuários Operadores
    const { data: userData } = await supabase
      .from('app_users')
      .select('*')
      .ilike('username', cleanUser)
      .eq('password', password)
      .maybeSingle();

    if (userData) {
      const companyId = userData.company_id || 'conveniencia-copasul';

      const { data: comp } = await supabase
        .from('companies')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (comp && comp.status === 'bloqueado') {
        setAuthError('Acesso suspenso: este estabelecimento está desativado.');
        return;
      }

      const userObj = { 
        username: userData.username, 
        role: userData.role || 'operador',
        company_id: companyId,
        avatar_url: userData.avatar_url || null
      };

      localStorage.setItem('sunmaker_user', JSON.stringify(userObj));
      localStorage.setItem('sunmaker_active_company', companyId);
      setCurrentUser(userObj);
      setActiveCompanyScope(companyId);
      setImpersonatedOperator(null);
      setIsAuthenticated(true);
      fetchProducts(companyId);
      return;
    }

    setAuthError('Usuário ou senha incorretos.');
  };

  // --- LOGOUT GARANTIDO (NUNCA TRAVA) ---
  const handleLogout = async () => {
    if (impersonatedOperator) {
      try {
        await supabase
          .from('app_users')
          .update({ active_support_by: null })
          .eq('id', impersonatedOperator.id);
      } catch (err) {
        console.error(err);
      }
    }
    try {
      localStorage.removeItem('sunmaker_user');
      localStorage.removeItem('sunmaker_active_company');
    } catch (e) {
      console.error(e);
    }
    setIsAuthenticated(false);
    setCurrentUser(null);
    setImpersonatedOperator(null);
    window.location.reload();
  };

  // --- MODO SUPORTE ---
  const handleOpenCompanyUsers = async (company) => {
    setSelectedCompanyForImpersonation(company);
    setShowCompanyUsersModal(true);

    const { data } = await supabase
      .from('app_users')
      .select('*')
      .eq('company_id', company.company_id)
      .order('created_at', { ascending: false });

    if (data) setCompanyOperatorsList(data);
  };

  const handleStartImpersonationWithUser = async (targetUser) => {
    try {
      await supabase
        .from('app_users')
        .update({ active_support_by: currentUser.username })
        .eq('id', targetUser.id);

      setActiveCompanyScope(selectedCompanyForImpersonation.company_id);
      setImpersonatedOperator(targetUser);
      fetchProducts(selectedCompanyForImpersonation.company_id);
      setShowCompanyUsersModal(false);
      setShowSettingsModal(false);
    } catch (err) {
      console.error("Erro ao iniciar suporte:", err);
    }
  };

  const handleStopImpersonation = async () => {
    if (impersonatedOperator) {
      try {
        await supabase
          .from('app_users')
          .update({ active_support_by: null })
          .eq('id', impersonatedOperator.id);
      } catch (err) {
        console.error(err);
      }
    }
    setImpersonatedOperator(null);
  };

  const isUserOnline = (lastSeen) => {
    if (!lastSeen) return false;
    return (new Date() - new Date(lastSeen)) / (1000 * 60) <= 5;
  };

  // --- GESTÃO B2B DE EMPRESAS ---
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

    if (!cleanName || cleanName.length < 3) return alert("Informe um nome de empresa válido.");
    if (!cleanSlug) {
      cleanSlug = cleanName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    }
    if (!cleanAdmin || cleanPass.length < 4) return alert("Informe login e senha de no mínimo 4 dígitos.");

    const { error: compError } = await supabase.from('companies').insert([
      { company_id: cleanSlug, company_name: cleanName, contact_phone: newCompanyPhone.trim(), status: 'ativo' }
    ]);

    if (compError) return alert("Erro ao cadastrar empresa: " + compError.message);

    await supabase.from('app_users').insert([
      { username: cleanAdmin, password: cleanPass, role: 'admin', company_id: cleanSlug }
    ]);

    alert(`Empresa "${cleanName}" cadastrada com sucesso.`);
    setNewCompanyName('');
    setNewCompanySlug('');
    setNewCompanyPhone('');
    setNewCompanyAdminUser('');
    setNewCompanyAdminPass('');
    fetchCompanies();
  };

  const handleToggleCompanyStatus = async (id, currentStatus, compName) => {
    const nextStatus = currentStatus === 'ativo' ? 'bloqueado' : 'ativo';
    if (!window.confirm(`Deseja alterar o status da empresa "${compName}" para ${nextStatus}?`)) return;
    await supabase.from('companies').update({ status: nextStatus }).eq('id', id);
    fetchCompanies();
  };

  // --- AVATAR ---
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
          if (width > maxSize) { height = Math.round((height * maxSize) / width); width = maxSize; }
        } else {
          if (height > maxSize) { width = Math.round((width * maxSize) / height); height = maxSize; }
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
          await supabase.from('app_users').update({ avatar_url: compressedBase64 }).ilike('username', currentUser.username).eq('company_id', currentUser.company_id);
        } catch (err) {
          console.error(err);
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
    await supabase.from('app_users').update({ avatar_url: null }).ilike('username', currentUser.username).eq('company_id', currentUser.company_id);
  };
  // --- BUSCA BLINDADA DE PRODUTOS (GARANTE A EXIBIÇÃO DA COPASUL) ---
  const fetchProducts = async (companyId) => {
    const targetCompany = companyId || effectiveCompanyId;
    if (!targetCompany) return;

    try {
      let query = supabase.from('products').select('*');

      if (targetCompany === 'conveniencia-copasul' || targetCompany === 'empresa-padrao' || targetCompany === 'sunmaker-master') {
        query = query.or('company_id.eq.conveniencia-copasul,company_id.eq.empresa-padrao,company_id.is.null');
      } else {
        query = query.eq('company_id', targetCompany);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && data) setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    const target = effectiveCompanyId;
    if (!target) return;
    const { data } = await supabase.from('app_users').select('*').eq('company_id', target).order('created_at', { ascending: false });
    if (data) setUsersList(data);
  };

  const handleCreateNewUser = async (e) => {
    e.preventDefault();
    const cleanUser = newUserName.trim().toLowerCase();
    const targetCompany = effectiveCompanyId;
    if (!cleanUser || !newUserPass || !targetCompany) return;

    const { error } = await supabase.from('app_users').insert([
      { username: cleanUser, password: newUserPass, role: newUserRole, company_id: targetCompany }
    ]);

    if (error) {
      alert("Erro ao cadastrar usuário: " + error.message);
    } else {
      alert(`Usuário "${cleanUser}" cadastrado com sucesso.`);
      setNewUserName('');
      setNewUserPass('');
      fetchUsers();
    }
  };

  const handleUpdateUserPassword = async (id, targetUser) => {
    if (!updatedPasswordValue || updatedPasswordValue.trim().length < 4) return alert("A senha deve ter no mínimo 4 dígitos.");
    await supabase.from('app_users').update({ password: updatedPasswordValue }).eq('id', id);
    alert(`Senha do usuário "${targetUser}" redefinida com sucesso.`);
    setEditingPasswordUserId(null);
    setUpdatedPasswordValue('');
    fetchUsers();
  };

  const handleDeleteUser = async (id, userToDelete) => {
    if (userToDelete === 'admin') return alert("Não é permitido excluir o administrador geral.");
    if (!window.confirm(`Confirma a exclusão do acesso de "${userToDelete}"?`)) return;
    await supabase.from('app_users').delete().eq('id', id);
    fetchUsers();
  };

  const handleSetPrice = async (id, priceValue) => {
    const rawPrice = String(priceValue).replace('R$', '').replace(/\s/g, '').replace(',', '.');
    const price = parseFloat(rawPrice);
    if (isNaN(price) || price <= 0) return;

    const product = products.find(p => p.id === id);
    if (!product) return;
    const cost = Number(product.cost) || 0;
    if (cost <= 0) return;

    let margin = calculationMode === 'markup' ? ((price - cost) / cost) * 100 : ((price - cost) / price) * 100;
    margin = Math.round(margin * 1000) / 1000;

    setProducts(products.map(p => p.id === id ? { ...p, margin, is_new: false } : p));
    if (typeof id === 'string' && !id.startsWith('local-')) {
      await supabase.from('products').update({ margin, is_new: false }).eq('id', id);
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
    const targetCompany = effectiveCompanyId;
    if (!targetCompany) return;
    if (!window.confirm(`ATENÇÃO: Deseja apagar todos os produtos de "${targetCompany}"?`)) return;

    setUploading(true);
    setUploadProgress('Limpando base de dados...');
    setProducts([]);

    let query = supabase.from('products').delete();
    if (targetCompany === 'conveniencia-copasul' || targetCompany === 'empresa-padrao') {
      query = query.or('company_id.eq.conveniencia-copasul,company_id.eq.empresa-padrao,company_id.is.null');
    } else {
      query = query.eq('company_id', targetCompany);
    }

    await query;
    setUploading(false);
    setUploadProgress('');
    alert("Base limpa com sucesso.");
  };

  const handleApplyCustomMarginAll = async () => {
    const margin = parseFloat(globalMarginValue);
    if (isNaN(margin) || margin <= 0 || products.length === 0) return alert("Informe uma margem válida.");
    if (!window.confirm(`Deseja aplicar ${margin}% em todos os ${products.length} produtos?`)) return;

    setUploading(true);
    setUploadProgress(`Aplicando ${margin}%...`);
    setProducts(products.map(p => ({ ...p, margin, is_new: false })));

    const idsToUpdate = products.filter(p => typeof p.id === 'string' && !p.id.startsWith('local-')).map(p => p.id);
    for (let i = 0; i < idsToUpdate.length; i += 200) {
      const batchIds = idsToUpdate.slice(i, i + 200);
      await supabase.from('products').update({ margin, is_new: false }).in('id', batchIds);
    }

    alert(`Margem de ${margin}% aplicada com sucesso.`);
    setUploading(false);
    setUploadProgress('');
  };

  const handlePrintPDF = () => {
    setShowSettingsModal(false);
    setTimeout(() => { window.print(); }, 200);
  };

  const startEditing = (product) => {
    setEditingId(product.id);
    const cost = Number(product.cost) || 0;
    const marginVal = product.margin !== null ? Number(product.margin) : 0;
    let currentPrice = '';
    if (marginVal > 0 && cost > 0) {
      currentPrice = (calculationMode === 'markup' 
        ? (cost + (cost * (marginVal / 100))) 
        : (marginVal < 100 ? cost / (1 - (marginVal / 100)) : cost + (cost * (marginVal / 100)))).toFixed(2);
    }
    setEditForm({ 
      name: product.name, 
      category: product.category || 'Geral', 
      stock: product.stock || 0, 
      cost: product.cost, 
      margin: product.margin !== null ? product.margin : '', 
      price: currentPrice 
    });
  };

  const handleEditPriceChange = (val) => {
    const numPrice = parseFloat(String(val).replace(',', '.'));
    const numCost = parseFloat(String(editForm.cost).replace(',', '.')) || 0;
    let calcMargin = editForm.margin;
    if (!isNaN(numPrice) && numPrice > 0 && numCost > 0) {
      calcMargin = (((numPrice - numCost) / (calculationMode === 'markup' ? numCost : numPrice)) * 100).toFixed(3);
    }
    setEditForm(prev => ({ ...prev, price: val, margin: calcMargin }));
  };

  const handleEditMarginChange = (val) => {
    const numMargin = parseFloat(String(val).replace(',', '.'));
    const numCost = parseFloat(String(editForm.cost).replace(',', '.')) || 0;
    let calcPrice = editForm.price;
    if (!isNaN(numMargin) && numMargin > 0 && numCost > 0) {
      calcPrice = (calculationMode === 'markup' 
        ? (numCost + (numCost * (numMargin / 100))) 
        : (numMargin < 100 ? numCost / (1 - (numMargin / 100)) : numCost + (numCost * (numMargin / 100)))).toFixed(2);
    }
    setEditForm(prev => ({ ...prev, margin: val, price: calcPrice }));
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
    const targetCompany = effectiveCompanyId;
    if (!file || !targetCompany) return alert("Selecione uma empresa válida.");
    setUploading(true);
    setUploadProgress('Lendo CSV...');

    const reader = new FileReader();
    reader.onload = async (event) => {
      Papa.parse(event.target.result, {
        skipEmptyLines: true,
        complete: async (results) => {
          const parsedProducts = [];
          let currentGroup = 'Geral';
          const headerRows = results.data.slice(0, 6);
          const headerText = headerRows.map(r => r.join(' ')).join(' ').toLowerCase();
          setCalculationMode(headerText.includes('markup') ? 'markup' : 'margin');

          results.data.forEach(row => {
            if (!Array.isArray(row)) return;
            const clean = row.map(c => String(c || '').trim()).filter(Boolean);
            if (clean.length === 0) return;

            if (clean.some(item => item.includes('Grupo:')) && !clean.some(item => item.includes('Total'))) {
              const dashIdx = clean.indexOf('-');
              if (dashIdx !== -1 && dashIdx + 1 < clean.length) currentGroup = clean[dashIdx + 1];
            }

            if (clean.length >= 3 && /^\d+$/.test(clean[0]) && clean[1] === '-') {
              const code = clean[0];
              const name = clean[2];
              const cost = clean.length > 3 ? parseFloat(clean[3].replace(/\./g, '').replace(',', '.')) || 0 : 0;
              const stock = clean.length > 4 ? parseFloat(clean[4].replace(/\./g, '').replace(',', '.')) || 0 : 0;
              let margin = null;
              for (let i = 3; i < clean.length; i++) {
                if (clean[i].includes('%')) {
                  const num = parseFloat(clean[i].replace('%', '').replace(/\./g, '').replace(',', '.'));
                  if (!isNaN(num)) margin = num;
                  break;
                }
              }
              parsedProducts.push({ 
                name: `${code} - ${name}`, 
                category: currentGroup, 
                stock, 
                cost, 
                margin, 
                is_new: true, 
                company_id: targetCompany 
              });
            }
          });

          for (let i = 0; i < parsedProducts.length; i += 500) {
            await supabase.from('products').insert(parsedProducts.slice(i, i + 500));
          }
          alert(`${parsedProducts.length} produtos importados com sucesso.`);
          fetchProducts(targetCompany);
          setUploading(false);
          setUploadProgress('');
          e.target.value = '';
        }
      });
    };
    reader.readAsText(file, "ISO-8859-1");
  };

  const categoriesList = ['todas', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // FILTRO DINÂMICO
  const filteredProducts = products.filter(p => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(term) || (p.category && p.category.toLowerCase().includes(term));
    const matchesCategory = selectedCategory === 'todas' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const productsWithoutMargin = filteredProducts.filter(p => p.margin === null || p.margin === undefined || p.margin === 0);

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
      const suggestedPrice = calculationMode === 'markup' 
        ? cost + (cost * (marginVal / 100)) 
        : (marginVal < 100 ? cost / (1 - (marginVal / 100)) : cost + (cost * (marginVal / 100)));
      const unitProfit = suggestedPrice - cost;
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
  // TELA DE LOGIN
  // ==========================================
  if (!isAuthenticated) {
    return (
      <div 
        className="min-h-screen w-full flex items-center justify-start p-6 md:p-16 lg:p-24 relative bg-cover bg-center"
        style={{ backgroundImage: `url("${LOGIN_BG_IMAGE}")` }}
      >
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" />
        <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col justify-between">
          <div className="p-8 pb-6">
            <div className="pb-5 border-b border-gray-200 mb-6">
              <h1 className="text-3xl font-black italic tracking-tighter text-amber-500">SunMaker</h1>
              <p className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase mt-0.5">Portal de Inteligência Comercial</p>
            </div>

            {authError && <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium text-center">{authError}</div>}

            <form onSubmit={handleLogin} className="space-y-4">
              <input type="text" placeholder="Nome de Usuário" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-gray-100 text-gray-800 text-sm px-4 py-3 rounded-lg outline-none border border-transparent focus:border-amber-500 focus:bg-white font-medium" required />
              <div className="relative">
                <input type={showPassword ? "text" : "password"} placeholder="Senha de Acesso" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-blue-50/50 text-gray-800 text-sm px-4 py-3 pr-11 rounded-lg outline-none border border-transparent focus:border-amber-500 focus:bg-white font-medium" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 rounded-lg text-sm tracking-wide shadow-md transition-all cursor-pointer">Acessar</button>
              <div className="text-center pt-2">
                <a href="#" onClick={(e) => { e.preventDefault(); alert("Contate o administrador para redefinir a credencial."); }} className="text-xs text-blue-600 hover:text-blue-800 underline font-medium">Recuperação de senha e suporte</a>
              </div>
            </form>
          </div>

          <div className="bg-gray-50/80 p-5 px-8 border-t border-gray-100 space-y-2 text-xs text-gray-600">
            <div onClick={handleOpenHelp} className="flex items-center justify-between cursor-pointer hover:text-gray-900">
              <div className="flex items-center gap-2"><HelpCircle size={14} className="text-gray-400" /><span>Central de ajuda</span></div>
              <span className={`text-[10px] font-semibold ${readHelp ? 'text-emerald-600' : 'text-amber-600'}`}>{readHelp ? '[Lido]' : '[Pendente]'}</span>
            </div>
            <div onClick={handleOpenTerms} className="flex items-center justify-between cursor-pointer hover:text-gray-900">
              <div className="flex items-center gap-2"><Info size={14} className="text-gray-400" /><span>Termos de uso</span></div>
              <span className={`text-[10px] font-semibold ${readTerms ? 'text-emerald-600' : 'text-amber-600'}`}>{readTerms ? '[Lido]' : '[Pendente]'}</span>
            </div>
            <div onClick={handleOpenPrivacy} className="flex items-center justify-between cursor-pointer hover:text-gray-900">
              <div className="flex items-center gap-2"><FileText size={14} className="text-gray-400" /><span>Política de privacidade</span></div>
              <span className={`text-[10px] font-semibold ${readPrivacy ? 'text-emerald-600' : 'text-amber-600'}`}>{readPrivacy ? '[Lido]' : '[Pendente]'}</span>
            </div>
          </div>
        </motion.div>

        {/* MODAL AJUDA */}
        <AnimatePresence>
          {showHelpModal && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl p-6 text-white max-h-[80vh] overflow-y-auto space-y-4">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                  <h3 className="font-bold flex items-center gap-2 text-amber-500"><BookOpen size={20} /> Central de Ajuda</h3>
                  <button onClick={() => setShowHelpModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">1. Exporte o arquivo de produtos do sistema Xpert em formato CSV.<br/>2. Clique em 'Upload Relatório' no topo do painel.<br/>3. Altere preços diretamente na coluna 'Definir Preço' e pressione Enter.</p>
                <div className="text-right pt-2"><button onClick={() => setShowHelpModal(false)} className="bg-neutral-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold">Confirmar Leitura e Fechar</button></div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL TERMOS */}
        <AnimatePresence>
          {showTermsModal && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl p-6 text-white max-h-[80vh] overflow-y-auto space-y-4 text-xs text-gray-300 leading-relaxed">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                  <h3 className="font-bold text-sm flex items-center gap-2 text-white"><Scale size={20} className="text-amber-500" /> Termos de Uso</h3>
                  <button onClick={() => setShowTermsModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
                </div>
                <p><strong>1. Uso Corporativo:</strong> O SunMaker é de uso restrito a estabelecimentos autorizados.</p>
                <p><strong>2. Sigilo Comercial:</strong> Margens, custos e estoques são confidenciais.</p>
                <p><strong>3. Responsabilidade:</strong> Cada operador responde pelos lançamentos realizados sob sua senha.</p>
                <div className="text-right pt-2"><button onClick={() => setShowTermsModal(false)} className="bg-neutral-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold">Confirmar Leitura e Fechar</button></div>
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL PRIVACIDADE */}
        <AnimatePresence>
          {showPrivacyModal && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl p-6 text-white max-h-[80vh] overflow-y-auto space-y-4 text-xs text-gray-300 leading-relaxed">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                  <h3 className="font-bold text-sm flex items-center gap-2 text-white"><Lock size={20} className="text-amber-500" /> Política de Privacidade</h3>
                  <button onClick={() => setShowPrivacyModal(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
                </div>
                <p><strong>1. LGPD:</strong> Tratamos apenas credenciais de login e identificadores de estoque essenciais para o cálculo financeiro.</p>
                <p><strong>2. Não Compartilhamento:</strong> Seus dados nunca são comercializados com terceiros.</p>
                <div className="text-right pt-2"><button onClick={() => setShowPrivacyModal(false)} className="bg-neutral-800 text-white px-4 py-1.5 rounded-lg text-xs font-semibold">Confirmar Leitura e Fechar</button></div>
              </div>
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
      {/* NOTIFICAÇÃO NA TELA DO CLIENTE QUANDO O ADMIN ESTIVER DENTRO */}
      {adminInsideNotification && (
        <div className="mb-6 p-3.5 bg-blue-950/80 border border-blue-500/50 rounded-xl flex items-center justify-between text-xs text-blue-200 shadow-xl no-print">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={18} className="text-blue-400 animate-pulse" />
            <span><strong>Aviso de Suporte:</strong> O Administrador Geral ({adminInsideNotification}) está acompanhando esta sessão.</span>
          </div>
          <span className="bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded text-[10px] font-semibold uppercase">Sessão Monitorada</span>
        </div>
      )}

      {/* BARRA SUPERIOR QUANDO O SUPER ADMIN ESTIVER EM MODO ESPELHO */}
      {impersonatedOperator && (
        <div className="mb-6 p-3 bg-amber-500/15 border border-amber-500/40 rounded-xl flex items-center justify-between text-xs text-amber-300 no-print">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-amber-400" />
            <span><strong>[Modo Suporte Ativo]:</strong> Espelhando o perfil de: <strong>{impersonatedOperator.username}</strong> | Loja: <strong>{effectiveCompanyId}</strong>.</span>
          </div>
          <button onClick={handleStopImpersonation} className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1 rounded-lg cursor-pointer">Encerrar Espelho</button>
        </div>
      )}

      {/* CABEÇALHO */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 border-b border-gray-800 pb-6 no-print">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-amber-500">SunMaker</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-400 text-sm">Dashboard de Inteligência</p>
            {isSuperAdmin && (
              <span className="bg-blue-950/80 text-blue-400 border border-blue-900 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                Ambiente: {activeCompanyScope}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input type="text" placeholder="Pesquisar produto ou código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-neutral-900 border border-neutral-700 text-white pl-9 pr-3 py-2 rounded-lg text-sm outline-none focus:border-amber-500" />
          </div>

          <div className="relative flex items-center">
            <Filter className="absolute left-3 text-gray-500 pointer-events-none" size={15} />
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-neutral-900 border border-neutral-700 text-white pl-8 pr-4 py-2 rounded-lg text-sm outline-none focus:border-amber-500 capitalize cursor-pointer max-w-[200px]">
              <option value="todas">Todas Categorias</option>
              {categoriesList.filter(c => c !== 'todas').map(cat => (<option key={cat} value={cat}>{cat}</option>))}
            </select>
          </div>

          <label className="cursor-pointer bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium">
            <Upload size={16} />
            <span>{uploading && uploadProgress !== '' ? uploadProgress : "Upload Relatório"}</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>

          <button onClick={() => { fetchUsers(); if (isSuperAdmin) fetchCompanies(); setShowSettingsModal(true); }} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold px-3.5 py-2 rounded-lg flex items-center gap-2 text-sm cursor-pointer">
            {currentUser?.avatar_url ? <img src={currentUser.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover border border-amber-500/50" /> : <Settings size={16} />}
            Configurações
          </button>

          <button onClick={handleLogout} className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-gray-300 font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm cursor-pointer">
            <LogOut size={16} className="text-gray-400" /> Sair
          </button>
        </div>
      </header>

      {/* ESTIMATIVA DE PERÍODO (DINÂMICA) */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neutral-900 p-5 rounded-2xl border border-neutral-800">
        <div className="flex items-center gap-4 no-print">
          <span className="text-gray-300 font-medium text-sm">Estimativa de Período:</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="bg-black border border-neutral-700 text-white rounded-md px-3 py-1.5 text-sm outline-none focus:border-amber-500 cursor-pointer">
            <option value="dias">Dias (Giro Diário)</option>
            <option value="semanas">Semanas (Giro Semanal)</option>
            <option value="meses">Meses (Giro Mensal do Lote)</option>
            <option value="anos">Anos (Projeção Anual)</option>
          </select>
        </div>
        <div className="text-left md:text-right">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold no-print">Projeção Estimada de Lucro ({period}) {selectedCategory !== 'todas' ? `- ${selectedCategory}` : ''}:</p>
          <p className="text-2xl font-black text-emerald-400">R$ {getPeriodProfit().toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <span className="text-[11px] text-gray-500">Calculado sobre os itens exibidos</span>
        </div>
      </div>

      {/* CARDS FINANCEIROS (DINÂMICOS POR CATEGORIA) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 no-print">
        <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 shadow-xl">
          <div className="flex items-center justify-between mb-3"><h3 className="text-gray-400 text-xs uppercase tracking-wider">Produtos / Itens</h3><Package className="text-amber-500" size={20} /></div>
          <p className="text-3xl font-bold">{filteredProducts.length}</p>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Boxes size={14} className="text-neutral-500" /><span className="text-amber-400 font-semibold">{totalStockUnits.toLocaleString('pt-BR')}</span> unidades em loja</p>
        </div>
        
        <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 shadow-xl">
          <div className="flex items-center justify-between mb-3"><h3 className="text-gray-400 text-xs uppercase tracking-wider">Capital Investido</h3><DollarSign className="text-blue-400" size={20} /></div>
          <p className="text-2xl font-bold text-gray-100">R$ {totalCostInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-500 mt-1">Custo dos itens exibidos</p>
        </div>

        <div className="bg-neutral-900 p-5 rounded-2xl border border-emerald-950/70 shadow-xl">
          <div className="flex items-center justify-between mb-3"><h3 className="text-emerald-400 text-xs uppercase tracking-wider">Lucro em Estoque</h3><TrendingUp className="text-emerald-400" size={20} /></div>
          <p className="text-2xl font-bold text-emerald-400">R$ {totalStockProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-500 mt-1">Venda estimada: <strong className="text-gray-300">R$ {totalSalesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
        </div>

        <div className="bg-neutral-900 p-5 rounded-2xl border border-red-950/70 shadow-xl">
          <div className="flex items-center justify-between mb-3"><h3 className="text-red-400 text-xs uppercase tracking-wider">Revisar Margem</h3><AlertCircle className="text-red-500" size={20} /></div>
          <p className="text-3xl font-bold text-red-500">{productsWithoutMargin.length}</p>
          <p className="text-xs text-gray-500 mt-1">Itens sem margem no filtro ativo</p>
        </div>
      </div>

      {/* LISTAGEM DE PRODUTOS */}
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-neutral-800 flex justify-between items-center no-print">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Listagem de Margens e Estoque</h2>
            {selectedCategory !== 'todas' && <span className="text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-md border border-amber-500/30">Categoria: {selectedCategory}</span>}
          </div>
          {(searchTerm || selectedCategory !== 'todas') && <span className="text-xs text-gray-400 bg-neutral-800 px-3 py-1 rounded-full border border-neutral-700">Exibindo: {filteredProducts.length} de {products.length}</span>}
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
                <tr><td colSpan={8} className="p-8 text-center text-gray-500 italic">Nenhum produto encontrado.</td></tr>
              ) : (
                filteredProducts.map(product => {
                  const isEditing = editingId === product.id;
                  const stockQty = Number(product.stock) || 0;
                  const cost = Number(product.cost) || 0;
                  const marginVal = product.margin !== null ? Number(product.margin) : 0;
                  let suggestedPrice = 0;
                  let unitProfit = 0;

                  if (marginVal > 0) {
                    suggestedPrice = calculationMode === 'markup' ? cost + (cost * (marginVal / 100)) : (marginVal < 100 ? cost / (1 - (marginVal / 100)) : cost + (cost * (marginVal / 100)));
                    unitProfit = suggestedPrice - cost;
                  }
                  const lotProfit = unitProfit * stockQty;

                  return (
                    <tr key={product.id} className="border-b border-neutral-800/60 hover:bg-white/5 transition-colors">
                      <td className="p-4 font-medium">
                        {isEditing ? <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-black border border-amber-500 rounded px-2 py-1 text-sm outline-none" /> : (
                          <div className="flex items-center gap-2">
                            <span>{product.name}</span>
                            {product.is_new && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase font-bold">Novo</span>}
                            {(!product.margin || product.margin === 0) && <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full border border-red-500/30 uppercase font-bold">Alerta</span>}
                          </div>
                        )}
                      </td>
                      <td className="p-4">{isEditing ? <input type="text" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="w-28 bg-black border border-amber-500 rounded px-2 py-1 text-sm outline-none" /> : <span className="text-xs bg-neutral-800 text-neutral-300 px-2 py-1 rounded border border-neutral-700">{product.category || 'Geral'}</span>}</td>
                      <td className="p-4 text-center">{isEditing ? <input type="number" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })} className="w-20 bg-black border border-amber-500 rounded px-2 py-1 text-sm text-center outline-none" /> : <span className="font-mono text-sm">{stockQty.toLocaleString('pt-BR')} un</span>}</td>
                      <td className="p-4 text-gray-300 font-mono text-sm">{isEditing ? <input type="number" step="0.001" value={editForm.cost} onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })} className="w-24 bg-black border border-amber-500 rounded px-2 py-1 text-sm outline-none" /> : `R$ ${cost.toFixed(2)}`}</td>
                      <td className="p-4">{isEditing ? <input type="number" step="0.001" value={editForm.margin} onChange={(e) => handleEditMarginChange(e.target.value)} className="w-20 bg-black border border-amber-500 rounded px-2 py-1 text-sm outline-none" /> : (marginVal > 0 ? <span className="text-amber-400 font-bold">{marginVal}%</span> : <span className="text-gray-500 italic">0%</span>)}</td>
                      <td className="p-4 font-mono text-sm">{isEditing ? <div className="flex items-center bg-black border border-emerald-500 rounded px-2 py-1"><span className="text-gray-400 text-xs mr-1">R$</span><input type="number" step="0.01" value={editForm.price} onChange={(e) => handleEditPriceChange(e.target.value)} className="w-20 bg-transparent text-sm text-emerald-400 font-semibold outline-none" /></div> : (marginVal > 0 ? <span className="text-gray-200">R$ {suggestedPrice.toFixed(2)}</span> : <span className="text-gray-600">-</span>)}</td>
                      <td className="p-4 font-mono text-sm font-semibold">{!isEditing && marginVal > 0 ? <span className="text-emerald-400">R$ {lotProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : <span className="text-gray-600">-</span>}</td>
                      <td className="p-4 no-print">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => saveEditing(product.id)} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded cursor-pointer"><Check size={18} /></button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded cursor-pointer"><X size={18} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <div className="flex items-center bg-black border border-neutral-700 rounded px-2 py-1 focus-within:border-amber-500" title="Digite o Preço Sugerido e aperte Enter">
                              <span className="text-gray-500 text-xs mr-1 font-semibold">R$</span>
                              <input type="number" step="0.01" placeholder="0,00" className="w-16 bg-transparent text-sm outline-none text-white font-mono" onKeyDown={(e) => { if (e.key === 'Enter') { handleSetPrice(product.id, e.target.value); e.target.value = ''; } }} onBlur={(e) => { if (e.target.value) { handleSetPrice(product.id, e.target.value); e.target.value = ''; } }} />
                            </div>
                            <button onClick={() => startEditing(product)} className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-400/10 rounded cursor-pointer" title="Editar"><Edit3 size={16} /></button>
                            <button onClick={() => handleRemoveMargin(product.id)} className="p-1.5 text-gray-400 hover:text-orange-400 hover:bg-orange-400/10 rounded cursor-pointer" title="Zerar Margem"><AlertCircle size={16} /></button>
                            <button onClick={() => handleDeleteProduct(product.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded cursor-pointer" title="Excluir"><Trash2 size={16} /></button>
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
      </div>

      {/* MODAL CONFIGURAÇÕES */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[88vh]">
              <div className="w-full md:w-56 bg-neutral-950 p-4 border-b md:border-b-0 md:border-r border-neutral-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 pb-4 mb-3 border-b border-neutral-800 text-white font-bold text-sm">
                    <Settings className="text-amber-500" size={18} /><span>Configurações</span>
                  </div>
                  <nav className="space-y-1">
                    <button onClick={() => setActiveSettingsTab('usuarios')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer ${activeSettingsTab === 'usuarios' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:bg-neutral-900 hover:text-white'}`}><Users size={15} /> Usuários</button>
                    <button onClick={() => setActiveSettingsTab('exportacao')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer ${activeSettingsTab === 'exportacao' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:bg-neutral-900 hover:text-white'}`}><Download size={15} /> Exportação</button>
                    <button onClick={() => setActiveSettingsTab('margens')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer ${activeSettingsTab === 'margens' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:bg-neutral-900 hover:text-white'}`}><Sliders size={15} /> Margens e Regras</button>
                    <button onClick={() => setActiveSettingsTab('empresa')} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer ${activeSettingsTab === 'empresa' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'text-gray-400 hover:bg-neutral-900 hover:text-white'}`}><Building2 size={15} /> Empresa e Conta</button>
                    {isSuperAdmin && (
                      <button onClick={() => { setActiveSettingsTab('empresas'); fetchCompanies(); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer ${activeSettingsTab === 'empresas' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'text-blue-400/80 hover:bg-neutral-900 hover:text-blue-300'}`}><Shield size={15} /> Gestão de Empresas</button>
                    )}
                  </nav>
                </div>
                <div className="pt-4 mt-4 border-t border-neutral-800 text-[11px] text-gray-500">SunMaker v1.2</div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center pb-4 mb-5 border-b border-neutral-800">
                    <h3 className="text-base font-bold text-white capitalize">
                      {activeSettingsTab === 'usuarios' && "Gerenciamento de Usuários e Logins"}
                      {activeSettingsTab === 'exportacao' && "Exportação e Relatórios"}
                      {activeSettingsTab === 'margens' && "Regras de Margem e Base de Dados"}
                      {activeSettingsTab === 'empresa' && "Informações da Empresa e Sessão"}
                      {activeSettingsTab === 'empresas' && "Gestão Central de Empresas (B2B)"}
                    </h3>
                    <button onClick={() => setShowSettingsModal(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={18} /></button>
                  </div>

                  {/* ABA: USUÁRIOS */}
                  {activeSettingsTab === 'usuarios' && (
                    <div className="space-y-6">
                      <form onSubmit={handleCreateNewUser} className="bg-black/40 border border-neutral-800 p-4 rounded-xl space-y-3">
                        <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5"><UserPlus size={14} className="text-emerald-400" /> Cadastrar Novo Login para: <strong className="text-white">{effectiveCompanyId}</strong></p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input type="text" placeholder="Login" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500" required />
                          <input type="password" placeholder="Senha" value={newUserPass} onChange={(e) => setNewUserPass(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500" required />
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 outline-none cursor-pointer">
                            <option value="operador">Perfil: Operador</option>
                            <option value="admin">Perfil: Administrador</option>
                          </select>
                          <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs cursor-pointer">Salvar Login</button>
                        </div>
                      </form>

                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Logins Cadastrados ({usersList.length})</p>
                        <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                          {usersList.map(u => (
                            <div key={u.id} className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex justify-between items-center">
                              <div>
                                <p className="text-sm font-semibold text-white flex items-center gap-2">{u.username}<span className="text-[10px] bg-neutral-800 text-gray-400 px-2 py-0.5 rounded capitalize">{u.role || 'operador'}</span></p>
                                <p className="text-[11px] text-gray-500">Cadastrado em: {new Date(u.created_at).toLocaleDateString('pt-BR')}</p>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => setEditingPasswordUserId(editingPasswordUserId === u.id ? null : u.id)} className="p-1.5 text-amber-400 hover:bg-amber-400/10 rounded cursor-pointer" title="Redefinir senha"><Key size={16} /></button>
                                {u.username !== 'admin' && <button onClick={() => handleDeleteUser(u.id, u.username)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded cursor-pointer" title="Remover"><Trash2 size={16} /></button>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ABA: GESTÃO DE EMPRESAS B2B */}
                  {activeSettingsTab === 'empresas' && isSuperAdmin && (
                    <div className="space-y-6">
                      <form onSubmit={handleCreateCompanyB2B} className="bg-black/40 border border-neutral-800 p-4 rounded-xl space-y-3">
                        <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5"><Building2 size={14} /> Cadastrar Nova Empresa / Cliente</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input type="text" placeholder="Nome Fantasia" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500" required />
                          <input type="text" placeholder="Identificador (slug)" value={newCompanySlug} onChange={(e) => setNewCompanySlug(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500 font-mono text-xs" />
                          <input type="text" placeholder="Telefone / Contato" value={newCompanyPhone} onChange={(e) => setNewCompanyPhone(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          <input type="text" placeholder="Login Inicial do Gerente" value={newCompanyAdminUser} onChange={(e) => setNewCompanyAdminUser(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500" required />
                          <input type="password" placeholder="Senha Inicial (min. 4 dígitos)" value={newCompanyAdminPass} onChange={(e) => setNewCompanyAdminPass(e.target.value)} className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500" required />
                        </div>
                        <div className="text-right pt-1"><button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer">Cadastrar Empresa</button></div>
                      </form>

                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Empresas Cadastradas ({companiesList.length})</p>
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                          {companiesList.map(comp => (
                            <div key={comp.id} className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex justify-between items-center">
                              <div>
                                <p className="text-sm font-semibold text-white flex items-center gap-2">{comp.company_name}<span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${comp.status === 'ativo' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-red-950 text-red-400 border border-red-900'}`}>{comp.status || 'ativo'}</span></p>
                                <p className="text-[11px] text-gray-500 font-mono">ID: {comp.company_id}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => { setActiveCompanyScope(comp.company_id); fetchProducts(comp.company_id); setShowSettingsModal(false); }} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer">Ver Catálogo</button>
                                <button onClick={() => handleOpenCompanyUsers(comp)} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"><Users size={14} /> Operadores</button>
                                <button onClick={() => handleToggleCompanyStatus(comp.id, comp.status, comp.company_name)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${comp.status === 'ativo' ? 'bg-red-950 text-red-400' : 'bg-emerald-950 text-emerald-400'}`}>{comp.status === 'ativo' ? 'Suspender' : 'Reativar'}</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ABA: EXPORTAÇÃO */}
                  {activeSettingsTab === 'exportacao' && (
                    <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-3 text-xs">
                      <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm"><Printer size={18} /> Relatório em PDF</div>
                      <p className="text-gray-300">Gera um relatório impresso com os produtos filtrados da empresa ativa ({effectiveCompanyId}).</p>
                      <button onClick={handlePrintPDF} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer"><Download size={15} /> Baixar PDF</button>
                    </div>
                  )}

                  {/* ABA: MARGENS E REGRAS */}
                  {activeSettingsTab === 'margens' && (
                    <div className="space-y-4 text-xs">
                      <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2">
                        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm"><Zap size={18} /> Margem Global em Massa</div>
                        <p className="text-gray-300">Atualiza todos os produtos da empresa ({effectiveCompanyId}) simultaneamente.</p>
                        <div className="flex items-center gap-2 pt-1">
                          <input type="number" value={globalMarginValue} onChange={(e) => setGlobalMarginValue(e.target.value)} className="w-20 bg-black border border-neutral-700 rounded-lg px-2 py-1 text-white font-bold outline-none" />
                          <button onClick={handleApplyCustomMarginAll} className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1.5 rounded-lg cursor-pointer">Aplicar</button>
                        </div>
                      </div>
                      <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-red-400 font-semibold"><Trash2 size={16} /> Limpar Estoque da Empresa</div>
                        <button onClick={handleClearAllData} className="bg-red-900 hover:bg-red-800 text-white font-bold px-3 py-1.5 rounded-lg cursor-pointer">Apagar Produtos</button>
                      </div>
                    </div>
                  )}

                  {/* ABA: EMPRESA E CONTA */}
                  {activeSettingsTab === 'empresa' && (
                    <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800 space-y-4 text-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-emerald-400 font-semibold text-sm flex items-center gap-2"><Building2 size={18} /> Identificação da Conta</h4>
                          <p className="text-gray-500 mt-1">Dados de acesso da sessão atual</p>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="relative group w-14 h-14 rounded-full bg-neutral-900 border-2 border-amber-500/60 overflow-hidden flex items-center justify-center">
                            {currentUser?.avatar_url ? <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xl font-black text-amber-500 uppercase">{currentUser?.username?.charAt(0)}</span>}
                            <button onClick={() => avatarInputRef.current?.click()} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer"><Camera size={16} /></button>
                            <input type="file" accept="image/*" ref={avatarInputRef} onChange={handleAvatarUpload} className="hidden" />
                          </div>
                          <button onClick={() => avatarInputRef.current?.click()} className="text-[11px] text-amber-400 mt-1 cursor-pointer">Trocar foto</button>
                        </div>
                      </div>

                      <div className="space-y-2 text-gray-300">
                        <div className="flex justify-between py-1 border-b border-neutral-900"><span className="text-gray-500">Usuário:</span><span className="font-semibold text-white">{currentUser?.username}</span></div>
                        <div className="flex justify-between py-1 border-b border-neutral-900"><span className="text-gray-500">Empresa Ativa:</span><span className="font-mono text-blue-400 font-semibold">{effectiveCompanyId}</span></div>
                        <div className="flex justify-between py-1"><span className="text-gray-500">Perfil:</span><span className="font-semibold text-amber-400 capitalize">{currentUser?.role}</span></div>
                      </div>

                      <button onClick={handleLogout} className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-gray-300 font-medium px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer"><LogOut size={14} /> Encerrar Sessão</button>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-neutral-800 text-right mt-6">
                  <button onClick={() => setShowSettingsModal(false)} className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer">Fechar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE OPERADORES DA EMPRESA */}
      <AnimatePresence>
        {showCompanyUsersModal && selectedCompanyForImpersonation && (
          <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg p-5 text-white space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                <h3 className="font-bold text-sm flex items-center gap-2 text-amber-500"><Building2 size={18} /> {selectedCompanyForImpersonation.company_name}</h3>
                <button onClick={() => setShowCompanyUsersModal(false)} className="text-gray-400 hover:text-white cursor-pointer"><X size={18} /></button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {companyOperatorsList.length === 0 ? <p className="text-xs text-gray-500 text-center py-4">Nenhum operador registrado.</p> : (
                  companyOperatorsList.map(u => {
                    const online = isUserOnline(u.last_seen_at);
                    return (
                      <div key={u.id} className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm flex items-center gap-2">{u.username}<span className={`text-[10px] px-2 py-0.2 rounded font-bold uppercase ${online ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-neutral-800 text-gray-400'}`}>{online ? 'Online' : 'Offline'}</span></p>
                          <p className="text-[11px] text-gray-500">{u.role || 'operador'}</p>
                        </div>
                        <button onClick={() => handleStartImpersonationWithUser(u)} className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer">Espelhar Perfil</button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
