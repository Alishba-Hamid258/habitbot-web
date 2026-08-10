'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageSquare, BarChart2, CheckSquare, BookOpen, Library, Flame, Target } from 'lucide-react';
import { getActiveUser, computeUserStats } from '@/lib/auth-storage';

const TABS = [
  { href: '/dashboard', label: 'Coach', icon: MessageSquare },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/dashboard/logbook', label: 'Logbook', icon: BookOpen },
  { href: '/dashboard/library', label: 'Library', icon: Library },
];

export function NavTabs() {
  const pathname = usePathname();
  const [stats, setStats] = useState({ streak: 0, disciplineRate: 0, isAtRisk: false });

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

  useEffect(() => {
    refreshStats();
    window.addEventListener('habitbot_data_updated', refreshStats);
    return () => window.removeEventListener('habitbot_data_updated', refreshStats);
  }, []);

  return (
    <header className="h-16 px-6 glass-panel border-b border-white/10 flex items-center justify-between z-10 shrink-0">
      {/* Navigation Tabs */}
      <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/5">
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
