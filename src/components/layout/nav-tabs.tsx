'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  BarChart2,
  CheckSquare,
  BookOpen,
  Library,
  Flame,
  Target,
  PanelLeftOpen,
  Sun,
  Moon,
} from 'lucide-react';
import { getActiveUser, computeUserStats } from '@/lib/auth-storage';
import { getInitialTheme, setThemeMode, ThemeMode } from '@/lib/theme';
import { toast } from 'sonner';

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
  const [currentTheme, setCurrentTheme] = useState<ThemeMode>('light');

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

  const syncTheme = () => {
    setCurrentTheme(getInitialTheme());
  };

  useEffect(() => {
    refreshStats();
    checkSidebarState();
    syncTheme();

    window.addEventListener('habitbot_data_updated', refreshStats);
    window.addEventListener('habitbot_sidebar_state_changed', checkSidebarState);
    window.addEventListener('habitbot_theme_changed', syncTheme);

    return () => {
      window.removeEventListener('habitbot_data_updated', refreshStats);
      window.removeEventListener('habitbot_sidebar_state_changed', checkSidebarState);
      window.removeEventListener('habitbot_theme_changed', syncTheme);
    };
  }, []);

  const handleToggleTheme = () => {
    const next: ThemeMode = currentTheme === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
    setCurrentTheme(next);
    toast.info(`Switched to ${next === 'light' ? 'Light ☀️' : 'Dark 🌙'} Theme`);
  };

  return (
    <header className="h-16 px-4 sm:px-6 bg-white dark:bg-[#1e1e1e] border-b border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between z-10 shrink-0 transition-colors shadow-none">
      {/* Navigation Tabs with Open Sidebar Trigger */}
      <div className="flex items-center gap-2.5 min-w-0">
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
              className="px-3.5 py-1.5 bg-[#f1f3f4] hover:bg-[#e8eaed] dark:bg-[#2d2e30] dark:hover:bg-[#3c4043] text-[#202124] dark:text-[#e8eaed] rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
              title="Open HabitBot Sidebar"
            >
              <PanelLeftOpen className="w-4 h-4 text-[#1a73e8] dark:text-[#8ab4f8]" />
              <span className="hidden sm:inline">Open Sidebar</span>
            </motion.button>
          )}
        </AnimatePresence>

        <nav className="flex items-center gap-1 bg-[#f1f3f4] dark:bg-[#2d2e30] p-1 rounded-full overflow-x-auto custom-scrollbar">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative px-4 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-colors ${
                  isActive
                    ? 'text-[#1a73e8] dark:text-[#8ab4f8] font-semibold'
                    : 'text-[#5f6368] hover:text-[#202124] dark:text-[#9aa0a6] dark:hover:text-[#e8eaed]'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? 'text-[#1a73e8] dark:text-[#8ab4f8]' : 'text-[#5f6368] dark:text-[#9aa0a6]'
                  }`}
                />
                <span>{tab.label}</span>

                {isActive && (
                  <motion.div
                    layoutId="nav-tab-active"
                    className="absolute inset-0 bg-[#e8f0fe] dark:bg-[#394457] rounded-full -z-10"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Top Right Live Stats & Theme Switcher */}
      <div className="flex items-center gap-2">
        <div
          title={
            stats.isAtRisk
              ? '⚠️ Streak At Risk! Check at least 1 habit or click Freeze Day today to keep your streak alive!'
              : `${stats.streak} consecutive days active!`
          }
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-colors ${
            stats.isAtRisk
              ? 'bg-[#fce8e6] text-[#c5221f] dark:bg-[#3c2020] dark:text-[#f28b82] font-semibold'
              : 'bg-[#fef7e0] text-[#b06000] dark:bg-[#3c3010] dark:text-[#fdd663]'
          }`}
        >
          <Flame
            className={`w-3.5 h-3.5 ${
              stats.isAtRisk ? 'text-[#d93025] animate-bounce' : 'text-[#f9ab00] fill-[#f9ab00]'
            }`}
          />
          <span className="font-semibold">{stats.isAtRisk ? `${stats.streak}d At Risk ⚠️` : `${stats.streak}d Streak`}</span>
        </div>

        <div
          title={`Discipline Rate: Completed Habits Today (${stats.disciplineRate}%)`}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#e6f4ea] dark:bg-[#1a3826] text-[#137333] dark:text-[#81c995] rounded-full text-xs font-mono font-semibold"
        >
          <Target className="w-3.5 h-3.5 text-[#1e8e3e] dark:text-[#81c995]" />
          <span>{stats.disciplineRate}% Discipline</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={handleToggleTheme}
          className="p-2 rounded-full hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] text-[#5f6368] hover:text-[#202124] dark:text-[#9aa0a6] dark:hover:text-[#e8eaed] transition-colors cursor-pointer"
          title={`Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {currentTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-[#fdd663]" />
          ) : (
            <Moon className="w-4 h-4 text-[#5f6368]" />
          )}
        </button>
      </div>
    </header>
  );
}
