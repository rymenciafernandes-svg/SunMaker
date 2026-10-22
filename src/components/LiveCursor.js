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
  const [clickRipples, setClickRipples] = useState([]);
  
  const lastEmitRef = useRef(0);
  const lastScrollEmitRef = useRef(0);
  const timeoutRef = useRef(null);
  const isReceivingScrollRef = useRef(false);

  useEffect(() => {
    if (!isActive || !companyId || !targetUsername) {
      setRemoteCursor(null);
      return;
    }

    const channelName = `cursor-${companyId}-${targetUsername}`;
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });

    // 1. ESCUTA COMANDOS VINDOS DO OUTRO COMPUTADOR
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

          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            setIsRemoteOnline(false);
          }, 4000);
        }
      })
      .on('broadcast', { event: 'cursor-click' }, ({ payload }) => {
        if (payload && payload.sender !== currentUsername) {
          const posX = payload.xRatio * window.innerWidth;
          const posY = payload.yRatio * window.innerHeight;

          // Adiciona animação de onda de clique
          const rippleId = Date.now();
          setClickRipples((prev) => [...prev, { id: rippleId, x: posX, y: posY }]);
          setTimeout(() => {
            setClickRipples((prev) => prev.filter((r) => r.id !== rippleId));
          }, 800);

          // Dispara o clique no elemento real embaixo do cursor
          const targetElement = document.elementFromPoint(posX, posY);
          if (targetElement) {
            targetElement.click();
            if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'SELECT' || targetElement.tagName === 'TEXTAREA') {
              targetElement.focus();
            }
          }
        }
      })
      .on('broadcast', { event: 'page-scroll' }, ({ payload }) => {
        if (payload && payload.sender !== currentUsername) {
          isReceivingScrollRef.current = true;
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          const targetY = payload.scrollRatio * (maxScroll > 0 ? maxScroll : 1);

          window.scrollTo({
            top: targetY,
            behavior: 'smooth'
          });

          setTimeout(() => {
            isReceivingScrollRef.current = false;
          }, 150);
        }
      })
      .subscribe();

    // 2. TRANSMITE MOVIMENTAÇÃO DO MOUSE
    const handleMouseMove = (e) => {
      const now = Date.now();
      if (now - lastEmitRef.current > 25) { // taxa de ~40 FPS para resposta imediata
        lastEmitRef.current = now;

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

    // 3. TRANSMITE CLIQUES DO MOUSE
    const handleClick = (e) => {
      const xRatio = e.clientX / window.innerWidth;
      const yRatio = e.clientY / window.innerHeight;

      channel.send({
        type: 'broadcast',
        event: 'cursor-click',
        payload: {
          xRatio,
          yRatio,
          sender: currentUsername
        }
      });
    };

    // 4. TRANSMITE ROLAGEM DA PÁGINA (SCROLL)
    const handleScroll = () => {
      if (isReceivingScrollRef.current) return;

      const now = Date.now();
      if (now - lastScrollEmitRef.current > 40) {
        lastScrollEmitRef.current = now;

        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const scrollRatio = maxScroll > 0 ? window.scrollY / maxScroll : 0;

        channel.send({
          type: 'broadcast',
          event: 'page-scroll',
          payload: {
            scrollRatio,
            sender: currentUsername
          }
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [isActive, companyId, targetUsername, currentUsername, currentUserRole]);

  if (!isActive || !remoteCursor || !isRemoteOnline) {
    return null;
  }

  const posX = remoteCursor.xRatio * (typeof window !== 'undefined' ? window.innerWidth : 1000);
  const posY = remoteCursor.yRatio * (typeof window !== 'undefined' ? window.innerHeight : 800);
  const isSuperAdmin = remoteCursor.role === 'superadmin' || remoteCursor.sender === 'admin';

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden no-print">
      {/* EFEITOS DE CLIQUE (ONDAS) */}
      {clickRipples.map((ripple) => (
        <span
          key={ripple.id}
          style={{ left: ripple.x - 18, top: ripple.y - 18 }}
          className="absolute w-9 h-9 rounded-full border-2 border-amber-400 animate-ping opacity-90 pointer-events-none"
        />
      ))}

      {/* CURSOR FLUIDO E RÁPIDO */}
      <motion.div
        animate={{ x: posX, y: posY }}
        transition={{ type: 'tween', ease: 'linear', duration: 0.04 }}
        className="absolute top-0 left-0 flex flex-col items-start select-none"
      >
        <svg
          width="22"
          height="22"
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

        <div
          className={`ml-3 -mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-black shadow-xl flex items-center gap-1.5 border border-black/30 ${
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
