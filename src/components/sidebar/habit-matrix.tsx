'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Plus, Trash2, Snowflake, ShieldCheck, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

import {
  getActiveUser,
  getUserScopedData,
  setUserScopedData,
  addXP,
  checkAndPerformDailyMidnightReset,
  calculateUserStreakInfo,
} from '@/lib/auth-storage';
import { Flame, AlertTriangle } from 'lucide-react';

interface HabitItem {
  id: string;
  name: string;
  completed: boolean;
}

const DEFAULT_HABITS: HabitItem[] = [
  { id: '1', name: '💧 Drink 2L Water', completed: false },
  { id: '2', name: '🏃 20m Morning Walk', completed: false },
  { id: '3', name: '📖 Read 10 Pages', completed: false },
  { id: '4', name: '🧘 10m Meditation', completed: false },
];

export function HabitMatrix() {
  const [habits, setHabits] = useState<HabitItem[]>([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [userId, setUserId] = useState<number>(1);

  // Load user-scoped habits and trigger daily midnight reset check
  useEffect(() => {
    const active = getActiveUser();
    if (active) {
      setUserId(active.id);
      checkAndPerformDailyMidnightReset(active.id);
      const defaultInitial = active.id === 1 ? DEFAULT_HABITS : [];
      const userHabits = getUserScopedData<HabitItem[]>(active.id, 'habits', defaultInitial);
      setHabits(userHabits);
      const userFrozen = getUserScopedData<boolean>(active.id, 'is_frozen', false);
      setIsFrozen(userFrozen);
    }
  }, []);

  const saveHabits = (updated: HabitItem[]) => {
    setHabits(updated);
    setUserScopedData(userId, 'habits', updated);
  };

  const toggleHabit = (id: string) => {
    setHabits((prev) => {
      const updated = prev.map((h) => (h.id === id ? { ...h, completed: !h.completed } : h));
      const target = updated.find((h) => h.id === id);

      if (target?.completed) {
        addXP(userId, 10);
        toast.success(`Logged: ${target.name} (+10 XP)`, { icon: '🛡️' });
        // Check if all habits are complete
        if (updated.every((h) => h.completed)) {
          addXP(userId, 50);
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#8b5cf6', '#06b6d4', '#ec4899', '#fbbf24'],
          });
          toast.success('🎉 PERFECT DAY! All core habits checked! (+50 XP Bonus)', {
            icon: '🏆',
          });
        }
      } else {
        addXP(userId, -10);
      }
      setUserScopedData(userId, 'habits', updated);
      return updated;
    });
  };

  const addHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newHabit: HabitItem = {
      id: Date.now().toString(),
      name: newHabitName.trim(),
      completed: false,
    };
    const updated = [...habits, newHabit];
    saveHabits(updated);
    setNewHabitName('');
    setShowAddForm(false);
    toast.success(`Habit "${newHabit.name}" added to daily matrix!`);
  };

  const removeHabit = (id: string, name: string) => {
    const updated = habits.filter((h) => h.id !== id);
    saveHabits(updated);
    toast.info(`Removed "${name}" from matrix.`);
  };

  // Toggle Freeze & Unfreeze freely
  const toggleFreezeDay = () => {
    if (!isFrozen) {
      setIsFrozen(true);
      setUserScopedData(userId, 'is_frozen', true);
      confetti({
        particleCount: 60,
        angle: 90,
        spread: 180,
        origin: { y: 0 },
        colors: ['#ffffff', '#bae6fd', '#e0f2fe', '#38bdf8'],
        shapes: ['circle'],
        ticks: 300,
        gravity: 0.4,
        scalar: 1.2,
      });
      toast.success('❄️ Streak Frozen! Your streak is safely shielded for today.', {
        icon: '🛡️',
      });
    } else {
      setIsFrozen(false);
      setUserScopedData(userId, 'is_frozen', false);
      toast.info('☀️ Streak Unfrozen. Back to active daily tracking!', {
        icon: '🔥',
      });
    }
  };

  const streakInfo = calculateUserStreakInfo(userId);
  const completedCount = habits.filter((h) => h.completed).length;
  const progress = habits.length ? Math.round((completedCount / habits.length) * 100) : 0;

  return (
    <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-3 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-purple-300">
          <CheckSquare className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" />
          <span>Daily Habit Matrix</span>
        </div>
        <span className="text-[11px] font-mono text-indigo-600 dark:text-cyan-400 bg-indigo-50 dark:bg-cyan-500/10 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-cyan-500/20 font-semibold">
          {completedCount}/{habits.length} ({progress}%)
        </span>
      </div>

      {/* Streak At-Risk Warning Banner (Grace State) */}
      {streakInfo.isAtRisk && !isFrozen && (
        <div className="p-2 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-500/40 rounded-lg flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300 animate-pulse shadow-sm">
          <div className="flex items-center gap-1.5 min-w-0">
            <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate"><b>{streakInfo.streak}d Streak at risk!</b> Check 1 habit or freeze</span>
          </div>
          <button
            onClick={toggleFreezeDay}
            className="text-[10px] text-indigo-600 dark:text-cyan-300 hover:underline font-semibold shrink-0 ml-1 cursor-pointer"
          >
            Freeze
          </button>
        </div>
      )}

      {/* Freeze Banner when active */}
      {isFrozen && (
        <div className="p-2 bg-sky-50 dark:bg-cyan-950/50 border border-sky-200 dark:border-cyan-500/30 rounded-lg flex items-center justify-between text-[11px] text-sky-800 dark:text-cyan-300 shadow-sm">
          <div className="flex items-center gap-1.5">
            <Snowflake className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400 animate-pulse" />
            <span>Streak Shield Active (Rest Day)</span>
          </div>
          <button
            onClick={toggleFreezeDay}
            className="text-[10px] text-sky-600 dark:text-cyan-200 hover:underline font-semibold cursor-pointer"
          >
            Unfreeze
          </button>
        </div>
      )}

      {/* Habits List */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
        <AnimatePresence>
          {habits.map((habit) => (
            <motion.div
              key={habit.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`group flex items-center justify-between p-2 rounded-lg border transition-all ${
                habit.completed
                  ? 'bg-emerald-50/80 dark:bg-purple-950/30 border-emerald-200 dark:border-purple-500/30 text-slate-700 dark:text-slate-300 shadow-sm'
                  : 'bg-white dark:bg-slate-950/50 border-slate-200/80 dark:border-white/5 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-white/10 shadow-sm'
              }`}
            >
              <button
                onClick={() => toggleHabit(habit.id)}
                className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer"
              >
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                    habit.completed
                      ? 'bg-emerald-600 dark:bg-purple-600 border-emerald-600 dark:border-purple-500 text-white'
                      : 'border-slate-300 dark:border-slate-600 group-hover:border-slate-400 dark:group-hover:border-purple-400'
                  }`}
                >
                  {habit.completed && <span className="text-[10px] font-bold">✓</span>}
                </div>
                <span
                  className={`text-xs truncate font-medium ${
                    habit.completed ? 'line-through text-slate-400 dark:text-slate-400' : ''
                  }`}
                >
                  {habit.name}
                </span>
              </button>

              <button
                onClick={() => removeHabit(habit.id, habit.name)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 p-1 transition-opacity cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Habit Form Toggle & Freeze/Unfreeze Button */}
      {showAddForm ? (
        <form onSubmit={addHabit} className="flex items-center gap-1.5 pt-1">
          <Input
            type="text"
            placeholder="Habit name..."
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            className="h-8 text-xs bg-white dark:bg-slate-950/80 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
            autoFocus
          />
          <Button size="sm" type="submit" className="h-8 px-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:gradient-button text-xs">
            Add
          </Button>
          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => setShowAddForm(false)}
            className="h-8 px-2 text-xs text-slate-500 dark:text-slate-400"
          >
            ✕
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(true)}
            className="flex-1 h-7 text-[11px] bg-white hover:bg-slate-100 dark:bg-slate-950/50 dark:hover:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 gap-1 rounded-lg shadow-sm"
          >
            <Plus className="w-3 h-3" /> Add Habit
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={toggleFreezeDay}
            className={`h-7 px-2.5 text-[11px] border gap-1 rounded-lg transition-all shadow-sm ${
              isFrozen
                ? 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-cyan-900/60 dark:text-cyan-200 dark:border-cyan-400/50'
                : 'bg-white hover:bg-sky-50 text-sky-700 dark:bg-slate-950/50 dark:hover:bg-cyan-950/30 dark:text-cyan-400 border-slate-200 dark:border-white/10'
            }`}
          >
            {isFrozen ? (
              <>
                <Sun className="w-3 h-3 text-amber-500" />
                <span>Unfreeze</span>
              </>
            ) : (
              <>
                <Snowflake className="w-3 h-3" />
                <span>Freeze Day</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
