'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, BarChart2, CheckSquare, BookOpen, Library, Flame, Target, PanelLeftOpen } from 'lucide-react';
import { getActiveUser, computeUserStats } from '@/lib/auth-storage';

const TABS = [
  { href: '/dashboard', label: 'Coach', icon: MessageSquare },
  { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/dashboard/logbook', label: 'Logbook', icon: BookOpen },
  { href: '/dashboard/library', label: 'Library', icon: Library },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
];

export function NavTabs() {
  const pathname = usePathname();
  const [stats, setStats] = useState({ streak: 0, disciplineRate: 0, isAtRisk: false });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const refreshStats = () => {
    const active = getActiveUser();
    if (active) {
      const userStats = computeUserStats(active.id);
      setStats({
        streak: userStats.streak,
        disciplineRate: userStats.disciplineRate,
        isAtRisk: userStats.isAtRisk,
      });
    }
  };

  const checkSidebarState = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('habitbot_sidebar_collapsed') === 'true';
      setIsSidebarCollapsed(saved);
    }
  };

  useEffect(() => {
    refreshStats();
    checkSidebarState();

    window.addEventListener('habitbot_data_updated', refreshStats);
    window.addEventListener('habitbot_sidebar_state_changed', checkSidebarState);

    return () => {
      window.removeEventListener('habitbot_data_updated', refreshStats);
      window.removeEventListener('habitbot_sidebar_state_changed', checkSidebarState);
    };
  }, []);

  return (
    <header className="h-16 px-4 sm:px-6 glass-panel border-b border-white/10 flex items-center justify-between z-10 shrink-0">
      {/* Navigation Tabs with Open Sidebar Trigger */}
      <div className="flex items-center gap-2 min-w-0">
        <AnimatePresence>
          {isSidebarCollapsed && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9, x: -10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: -10 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                localStorage.setItem('habitbot_sidebar_collapsed', 'false');
                window.dispatchEvent(new Event('habitbot_open_sidebar'));
                window.dispatchEvent(new Event('habitbot_sidebar_state_changed'));
              }}
              className="px-2.5 py-1.5 bg-purple-950/70 hover:bg-purple-900/90 border border-purple-500/30 text-purple-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm group shrink-0 cursor-pointer"
              title="Open HabitBot Sidebar"
            >
              <PanelLeftOpen className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Open Sidebar</span>
            </motion.button>
          )}
        </AnimatePresence>

        <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/5 overflow-x-auto custom-scrollbar">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>

              {isActive && (
                <motion.div
                  layoutId="nav-tab-active"
                  className="absolute inset-0 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-500/40 rounded-lg -z-10 shadow-sm"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
            </Link>
          );
        })}
        </nav>
      </div>

      {/* Top Right Live Stats Badge with Streak At-Risk Shield */}
      <div className="flex items-center gap-2">
        <div
          title={
            stats.isAtRisk
              ? '⚠️ Streak At Risk! Check at least 1 habit or click Freeze Day today to keep your streak alive!'
              : `${stats.streak} consecutive days active!`
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-all ${
            stats.isAtRisk
              ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/20 animate-pulse'
              : 'bg-slate-900/80 border-white/5 text-amber-300'
          }`}
        >
          <Flame className={`w-3.5 h-3.5 ${stats.isAtRisk ? 'text-amber-400 animate-bounce' : 'text-amber-400 fill-amber-400'}`} />
          <span>{stats.isAtRisk ? `${stats.streak}d At Risk ⚠️` : `${stats.streak}d Streak`}</span>
        </div>

        <div
          title={`Discipline Rate: Completed Habits Today (${stats.disciplineRate}%)`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 rounded-lg border border-white/5 text-xs text-cyan-300 font-mono"
        >
          <Target className="w-3.5 h-3.5 text-cyan-400" />
          <span>{stats.disciplineRate}% Discipline</span>
        </div>
      </div>
    </header>
  );
}
