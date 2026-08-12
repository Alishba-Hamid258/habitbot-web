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
    <div className="p-4 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] space-y-3 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[#202124] dark:text-[#e8eaed]">
          <CheckSquare className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8]" />
          <span>Daily Habit Matrix</span>
        </div>
        <span className="text-[11px] font-mono text-[#1a73e8] dark:text-[#8ab4f8] bg-[#e8f0fe] dark:bg-[#394457] px-2 py-0.5 rounded-full font-semibold">
          {completedCount}/{habits.length} ({progress}%)
        </span>
      </div>

      {/* Streak At-Risk Warning Banner (Grace State) */}
      {streakInfo.isAtRisk && !isFrozen && (
        <div className="p-2.5 bg-[#fef7e0] dark:bg-[#3c3010] border border-[#f9ab00]/40 rounded-xl flex items-center justify-between text-[11px] text-[#b06000] dark:text-[#fdd663]">
          <div className="flex items-center gap-1.5 min-w-0">
            <Flame className="w-3.5 h-3.5 text-[#e37400] shrink-0" />
            <span className="truncate"><b>{streakInfo.streak}d Streak at risk!</b> Check 1 habit or freeze</span>
          </div>
          <button
            onClick={toggleFreezeDay}
            className="text-[11px] text-[#1a73e8] dark:text-[#8ab4f8] hover:underline font-semibold shrink-0 ml-1 cursor-pointer"
          >
            Freeze
          </button>
        </div>
      )}

      {/* Freeze Banner when active */}
      {isFrozen && (
        <div className="p-2.5 bg-[#e8f0fe] dark:bg-[#394457] border border-[#1a73e8]/30 rounded-xl flex items-center justify-between text-[11px] text-[#1967d2] dark:text-[#8ab4f8]">
          <div className="flex items-center gap-1.5">
            <Snowflake className="w-3.5 h-3.5 text-[#1a73e8] dark:text-[#8ab4f8] animate-pulse" />
            <span>Streak Shield Active (Rest Day)</span>
          </div>
          <button
            onClick={toggleFreezeDay}
            className="text-[11px] text-[#1a73e8] dark:text-[#8ab4f8] hover:underline font-semibold cursor-pointer"
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
              className={`group flex items-center justify-between p-2 rounded-xl border transition-colors ${
                habit.completed
                  ? 'bg-[#e6f4ea] dark:bg-[#1a3826] border-[#1e8e3e]/30 text-[#137333] dark:text-[#81c995]'
                  : 'bg-white dark:bg-[#1e1e1e] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] hover:bg-[#f8f9fa] dark:hover:bg-[#252629]'
              }`}
            >
              <button
                onClick={() => toggleHabit(habit.id)}
                className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer"
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center border-2 transition-colors ${
                    habit.completed
                      ? 'bg-[#1e8e3e] border-[#1e8e3e] text-white'
                      : 'border-[#5f6368] dark:border-[#9aa0a6] group-hover:border-[#1a73e8]'
                  }`}
                >
                  {habit.completed && <span className="text-[10px] font-bold">✓</span>}
                </div>
                <span
                  className={`text-xs truncate font-medium ${
                    habit.completed ? 'line-through text-[#5f6368] dark:text-[#9aa0a6]' : ''
                  }`}
                >
                  {habit.name}
                </span>
              </button>

              <button
                onClick={() => removeHabit(habit.id, habit.name)}
                className="opacity-0 group-hover:opacity-100 text-[#5f6368] hover:text-[#d93025] dark:text-[#9aa0a6] dark:hover:text-[#f28b82] p-1 transition-opacity cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
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
            className="h-8 text-xs bg-white dark:bg-[#1e1e1e] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] rounded-full px-3"
            autoFocus
          />
          <Button size="sm" type="submit" className="h-8 px-3 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs rounded-full font-medium shadow-none">
            Add
          </Button>
          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => setShowAddForm(false)}
            className="h-8 px-2 text-xs text-[#5f6368] dark:text-[#9aa0a6] rounded-full"
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
            className="flex-1 h-7 text-[11px] bg-white hover:bg-[#f1f3f4] dark:bg-[#1e1e1e] dark:hover:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] gap-1 rounded-full font-medium"
          >
            <Plus className="w-3 h-3" /> Add Habit
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={toggleFreezeDay}
            className={`h-7 px-3 text-[11px] border gap-1 rounded-full font-medium transition-colors ${
              isFrozen
                ? 'bg-[#e8f0fe] text-[#1967d2] border-[#1a73e8]/40 dark:bg-[#394457] dark:text-[#8ab4f8]'
                : 'bg-white hover:bg-[#f1f3f4] text-[#1a73e8] dark:bg-[#1e1e1e] dark:hover:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043]'
            }`}
          >
            {isFrozen ? (
              <>
                <Sun className="w-3 h-3 text-[#f9ab00]" />
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
