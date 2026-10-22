import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export default function LiveCursor({
  companyId,
  currentUsername,
  currentUserRole,
  targetUsername,
  isActive
}) {
  const [remoteCursor, setRemoteCursor] = useState(null);
  const [isRemoteOnline, setIsRemoteOnline] = useState(false);
  const lastEmitRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Só ativa o canal de transmissão se a sessão de suporte estiver ligada
    if (!isActive || !companyId || !targetUsername) {
      setRemoteCursor(null);
      return;
    }

    const channelName = `cursor-${companyId}-${targetUsername}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });

    // Escuta os movimentos do mouse do outro computador
    channel
      .on('broadcast', { event: 'cursor-pos' }, ({ payload }) => {
        if (payload && payload.sender !== currentUsername) {
          setRemoteCursor({
            xRatio: payload.xRatio,
            yRatio: payload.yRatio,
            sender: payload.sender,
            role: payload.role
          });
          setIsRemoteOnline(true);

          // Esconde a seta se a outra pessoa ficar 4 segundos parada
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setIsRemoteOnline(false);
          }, 4000);
        }
      })
      .subscribe();

    // Rastreia o movimento do mouse na tela local e envia
    const handleMouseMove = (e) => {
      const now = Date.now();
      // Limita o envio a 30 vezes por segundo (a cada ~33ms) para manter 60fps sem engasgos
      if (now - lastEmitRef.current > 33) {
        lastEmitRef.current = now;

        // Converte para proporção relativa (0 a 1) para funcionar em qualquer resolução de tela
        const xRatio = e.clientX / window.innerWidth;
        const yRatio = e.clientY / window.innerHeight;

        channel.send({
          type: 'broadcast',
          event: 'cursor-pos',
          payload: {
            xRatio,
            yRatio,
            sender: currentUsername,
            role: currentUserRole || 'operador'
          }
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [isActive, companyId, targetUsername, currentUsername, currentUserRole]);

  // Se não estiver em suporte ativo ou não houver sinal da outra máquina, não renderiza nada
  if (!isActive || !remoteCursor || !isRemoteOnline) {
    return null;
  }

  // Converte a proporção recebida para pixels da tela atual
  const posX = remoteCursor.xRatio * (typeof window !== 'undefined' ? window.innerWidth : 1000);
  const posY = remoteCursor.yRatio * (typeof window !== 'undefined' ? window.innerHeight : 800);
  const isSuperAdmin = remoteCursor.role === 'superadmin' || remoteCursor.sender === 'admin';

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden no-print">
      <motion.div
        animate={{ x: posX, y: posY }}
        transition={{ type: 'spring', damping: 30, stiffness: 350, mass: 0.2 }}
        className="absolute top-0 left-0 flex flex-col items-start select-none"
      >
        {/* Seta do Cursor Estilo Figma */}
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] -translate-x-1 -translate-y-1"
        >
          <path
            d="M5.65 2.15C5.1 1.6 4.25 2.05 4.3 2.85L5.75 19.35C5.8 20.05 6.7 20.35 7.2 19.85L11.5 15.5L16.2 21.8C16.5 22.2 17.1 22.3 17.5 22L20.2 20C20.6 19.7 20.7 19.1 20.4 18.7L15.7 12.4L21.4 11.2C22.1 11.05 22.3 10.15 21.75 9.75L5.65 2.15Z"
            fill={isSuperAdmin ? '#F59E0B' : '#10B981'}
            stroke="#000000"
            strokeWidth="1.5"
          />
        </svg>

        {/* Tag com o nome de quem está mexendo */}
        <div
          className={`ml-3.5 -mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-black shadow-xl flex items-center gap-1.5 border border-black/30 ${
            isSuperAdmin ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-black/80 animate-ping" />
          <span>{isSuperAdmin ? `Suporte (${remoteCursor.sender})` : remoteCursor.sender}</span>
        </div>
      </motion.div>
    </div>
  );
}
