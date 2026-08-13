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

  const loadHabits = (uid: number) => {
    const defaultInitial = uid === 1 ? DEFAULT_HABITS : [];
    const userHabits = getUserScopedData<HabitItem[]>(uid, 'habits', defaultInitial);
    setHabits(userHabits);
    const userFrozen = getUserScopedData<boolean>(uid, 'is_frozen', false);
    setIsFrozen(userFrozen);
  };

  // Load user-scoped habits and listen for day resets / live data updates
  useEffect(() => {
    const active = getActiveUser();
    if (active) {
      setUserId(active.id);
      checkAndPerformDailyMidnightReset(active.id);
      loadHabits(active.id);
    }

    const handleDataUpdate = () => {
      const u = getActiveUser();
      if (u) {
        loadHabits(u.id);
      }
    };

    window.addEventListener('habitbot_data_updated', handleDataUpdate);
    return () => {
      window.removeEventListener('habitbot_data_updated', handleDataUpdate);
    };
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
    <div className="p-3.5 bg-card rounded-xl border border-border space-y-3 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <CheckSquare className="w-3.5 h-3.5 text-primary" />
          <span>Daily Habits</span>
        </div>
        <span className="text-[11px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md font-semibold">
          {completedCount}/{habits.length} ({progress}%)
        </span>
      </div>

      {/* Streak At-Risk Warning Banner (Grace State) */}
      {streakInfo.isAtRisk && !isFrozen && (
        <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 rounded-lg flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-1.5 min-w-0">
            <Flame className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate"><b>{streakInfo.streak}d streak at risk.</b> Log 1 habit</span>
          </div>
          <button
            onClick={toggleFreezeDay}
            className="text-[11px] text-primary hover:underline font-semibold shrink-0 ml-1 cursor-pointer"
          >
            Freeze
          </button>
        </div>
      )}

      {/* Freeze Banner when active */}
      {isFrozen && (
        <div className="p-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 rounded-lg flex items-center justify-between text-[11px] text-blue-800 dark:text-blue-300">
          <div className="flex items-center gap-1.5">
            <Snowflake className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Streak Shield Active (Rest Day)</span>
          </div>
          <button
            onClick={toggleFreezeDay}
            className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
          >
            Unfreeze
          </button>
        </div>
      )}

      {/* Habits List */}
      <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
        <AnimatePresence>
          {habits.map((habit) => (
            <motion.div
              key={habit.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`group flex items-center justify-between p-2 rounded-lg border transition-colors ${
                habit.completed
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/30 text-emerald-900 dark:text-emerald-300'
                  : 'bg-background border-border/70 text-foreground hover:bg-muted/40'
              }`}
            >
              <button
                onClick={() => toggleHabit(habit.id)}
                className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer"
              >
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                    habit.completed
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-muted-foreground/50 group-hover:border-primary'
                  }`}
                >
                  {habit.completed && <span className="text-[10px] font-bold">✓</span>}
                </div>
                <span
                  className={`text-xs truncate font-medium ${
                    habit.completed ? 'line-through text-muted-foreground' : ''
                  }`}
                >
                  {habit.name}
                </span>
              </button>

              <button
                onClick={() => removeHabit(habit.id, habit.name)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition-opacity cursor-pointer"
                title="Delete habit"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Habit Form Toggle & Freeze/Unfreeze Button */}
      {showAddForm ? (
        <form onSubmit={addHabit} className="flex items-center gap-1.5 pt-0.5">
          <Input
            type="text"
            placeholder="Habit name..."
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            className="h-8 text-xs bg-background border-border text-foreground rounded-md px-2.5"
            autoFocus
          />
          <Button size="sm" type="submit" className="h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs rounded-md font-medium">
            Add
          </Button>
          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => setShowAddForm(false)}
            className="h-8 px-2 text-xs text-muted-foreground rounded-md"
          >
            ✕
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2 pt-0.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(true)}
            className="flex-1 h-7 text-[11px] bg-card hover:bg-muted border-border text-foreground gap-1 rounded-md font-medium"
          >
            <Plus className="w-3 h-3" /> Add Habit
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={toggleFreezeDay}
            className={`h-7 px-2.5 text-[11px] border gap-1 rounded-md font-medium transition-colors ${
              isFrozen
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                : 'bg-card hover:bg-muted text-foreground border-border'
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
