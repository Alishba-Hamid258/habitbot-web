'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bot, LogOut, Shield, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { XPBar } from '@/components/gamification/xp-bar';
import { PomodoroTimer } from '@/components/sidebar/pomodoro-timer';
import { HabitMatrix } from '@/components/sidebar/habit-matrix';
import { MediaPlayer } from '@/components/sidebar/media-player';
import { toast } from 'sonner';
import { getActiveUser, logoutActiveUser } from '@/lib/auth-storage';

export function Sidebar() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ id: number; username: string; isAdmin?: boolean }>({
    id: 1,
    username: 'user',
  });

  useEffect(() => {
    const active = getActiveUser();
    if (active) {
      setCurrentUser(active);
    }
  }, []);

  const handleLogout = () => {
    logoutActiveUser();
    toast.info('Logged out successfully.');
    router.push('/login');
  };

  return (
    <aside className="w-80 h-full flex flex-col glass-panel border-r border-white/10 bg-[#0b1120]/90 backdrop-blur-2xl z-20">
      {/* Header Brand */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-md shadow-purple-500/20">
            <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div>
            <h2 className="text-base font-bold gradient-text leading-tight">HabitBot</h2>
            <p className="text-[10px] text-slate-400 font-mono">v5.0 Pro Suite</p>
          </div>
        </div>

        {currentUser.isAdmin && (
          <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Shield className="w-3 h-3 text-amber-400" /> Admin
          </span>
        )}
      </div>

      {/* Scrollable Workspace Body */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar">
        {/* User Card */}
        <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white capitalize">{currentUser.username}</div>
              <div className="text-[10px] font-mono text-cyan-300">ID: #{currentUser.id}</div>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleLogout}
            className="h-7 text-xs text-slate-400 hover:text-red-400 hover:bg-red-950/20 px-2 gap-1 rounded-lg"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </Button>
        </div>

        {/* Gamification Level & XP */}
        <XPBar totalXP={240} />

        {/* Pomodoro Focus Timer */}
        <PomodoroTimer />

        {/* Daily Habit Matrix */}
        <HabitMatrix />

        {/* Focus Audio & Media Player */}
        <MediaPlayer />
      </div>
    </aside>
  );
}
