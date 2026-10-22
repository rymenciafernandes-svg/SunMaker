import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Shield, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SupportChat({ 
  companyId, 
  currentUsername, 
  currentUserRole, 
  operatorUsername,
  isVisible 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);

  // Não renderiza nada se o suporte não estiver ativo
  if (!isVisible || !companyId || !operatorUsername) return null;

  // Busca o histórico inicial de mensagens desta sessão de suporte
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('company_id', companyId)
        .eq('operator_username', operatorUsername)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Escuta novas mensagens em tempo real via WebSockets
    const channel = supabase
      .channel(`chat-${companyId}-${operatorUsername}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `operator_username=eq.${operatorUsername}`
        },
        (payload) => {
          if (payload.new && payload.new.company_id === companyId) {
            setMessages((prev) => [...prev, payload.new]);
            if (!isOpen && payload.new.sender_username !== currentUsername) {
              setUnreadCount((count) => count + 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, operatorUsername, isOpen, currentUsername]);

  // Rola automaticamente para a última mensagem
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text) return;

    setNewMessage('');

    try {
      await supabase.from('support_messages').insert([
        {
          company_id: companyId,
          operator_username: operatorUsername,
          sender_username: currentUsername,
          sender_role: currentUserRole || 'operador',
          message: text
        }
      ]);
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
    }
  };

  const handleToggleOpen = () => {
    if (!isOpen) setUnreadCount(0);
    setIsOpen(!isOpen);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end no-print">
      {/* JANELA DE CONVERSA EXPANDIDA */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-80 sm:w-96 h-[500px] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-3"
          >
            {/* Topo do Chat */}
            <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Shield size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    Canal Direto de Suporte
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </h4>
                  <p className="text-[10px] text-gray-400">
                    Atendimento com: <strong className="text-amber-400">{operatorUsername}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Lista de Mensagens */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-2">
                  <MessageSquare size={28} className="text-neutral-700" />
                  <p className="text-[11px]">Nenhuma mensagem ainda.<br />Inicie a conversa pelo suporte.</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender_username?.toLowerCase() === currentUsername?.toLowerCase();
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] text-gray-500 mb-0.5 px-1">
                        {isMe ? 'Você' : m.sender_username} ({m.sender_role})
                      </span>
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                          isMe
                            ? 'bg-amber-500 text-black font-medium rounded-tr-none'
                            : 'bg-neutral-800 text-white rounded-tl-none border border-neutral-700'
                        }`}
                      >
                        {m.message}
                      </div>
                      <span className="text-[9px] text-neutral-600 mt-0.5 px-1 font-mono">
                        {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Campo de Envio */}
            <form onSubmit={handleSendMessage} className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center gap-2">
              <input
                type="text"
                placeholder="Digite sua mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 transition-colors placeholder:text-neutral-500"
              />
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-black p-2 rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-40"
                disabled={!newMessage.trim()}
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTÃO FLUTUANTE CIRCULAR (LOCAL INDICADO NO PRINT) */}
      <button
        onClick={handleToggleOpen}
        className="w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-black shadow-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer relative border-2 border-amber-300/40"
        title="Abrir Chat de Suporte"
      >
        <MessageSquare size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-black">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
