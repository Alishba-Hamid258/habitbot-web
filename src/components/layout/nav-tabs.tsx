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
import { ScoringGuideModal } from '@/components/modals/scoring-guide-modal';

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
  const [showScoringGuide, setShowScoringGuide] = useState(false);
  const [scoringTab, setScoringTab] = useState<'xp' | 'streak' | 'discipline'>('streak');

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
    <header className="h-14 px-4 sm:px-6 bg-card border-b border-border flex items-center justify-between z-10 shrink-0 transition-colors">
      {/* Navigation Tabs with Open Sidebar Trigger */}
      <div className="flex items-center gap-3 min-w-0">
        <AnimatePresence>
          {isSidebarCollapsed && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9, x: -6 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: -6 }}
              transition={{ duration: 0.15 }}
              onClick={() => {
                localStorage.setItem('habitbot_sidebar_collapsed', 'false');
                window.dispatchEvent(new Event('habitbot_open_sidebar'));
                window.dispatchEvent(new Event('habitbot_sidebar_state_changed'));
              }}
              className="h-8 px-2.5 bg-muted hover:bg-secondary text-foreground rounded-md text-xs font-medium flex items-center gap-1.5 border border-border transition-colors shrink-0 cursor-pointer"
              title="Open Sidebar"
            >
              <PanelLeftOpen className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Sidebar</span>
            </motion.button>
          )}
        </AnimatePresence>

        <nav className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/50">
          {TABS.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                  isActive
                    ? 'text-foreground font-semibold bg-background shadow-xs border border-border/60'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Top Right Live Stats & Theme Switcher */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setScoringTab('streak');
            setShowScoringGuide(true);
          }}
          title={
            stats.isAtRisk
              ? 'Streak at risk. Click to view streak & grace rules.'
              : `${stats.streak} consecutive days active. Click to learn more.`
          }
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border transition-colors cursor-pointer hover:opacity-90 active:scale-95 ${
            stats.isAtRisk
              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40 font-medium'
              : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800/40'
          }`}
        >
          <Flame
            className={`w-3.5 h-3.5 ${
              stats.isAtRisk ? 'text-red-500' : 'text-amber-500 fill-amber-500'
            }`}
          />
          <span className="font-semibold">{stats.streak}d streak</span>
        </button>

        <button
          onClick={() => {
            setScoringTab('discipline');
            setShowScoringGuide(true);
          }}
          title={`Discipline Score: ${stats.disciplineRate}% (Rolling 7-day Habit & Task Execution). Click to learn how it is calculated.`}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium border transition-colors cursor-pointer hover:opacity-90 active:scale-95 ${
            stats.disciplineRate >= 80
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/40'
              : stats.disciplineRate >= 50
              ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/40'
              : 'bg-muted text-muted-foreground border-border'
          }`}
        >
          <Target className={`w-3.5 h-3.5 ${
            stats.disciplineRate >= 80
              ? 'text-emerald-600 dark:text-emerald-400'
              : stats.disciplineRate >= 50
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-muted-foreground'
          }`} />
          <span>{stats.disciplineRate}%</span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={handleToggleTheme}
          className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent hover:border-border transition-colors cursor-pointer"
          title={`Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {currentTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Scoring Guide Modal */}
      {showScoringGuide && (
        <ScoringGuideModal
          open={showScoringGuide}
          onOpenChange={setShowScoringGuide}
          defaultTab={scoringTab}
        />
      )}
    </header>
  );
}
