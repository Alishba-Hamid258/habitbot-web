'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Plus, Trash2, Snowflake, Trophy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';

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
  const [habits, setHabits] = useState<HabitItem[]>(DEFAULT_HABITS);
  const [newHabitName, setNewHabitName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);

  const toggleHabit = (id: string) => {
    setHabits((prev) => {
      const updated = prev.map((h) => (h.id === id ? { ...h, completed: !h.completed } : h));
      const target = updated.find((h) => h.id === id);

      if (target?.completed) {
        toast.success(`Logged: ${target.name} (+10 XP)`, { icon: '🛡️' });
        // Check if all habits are complete
        if (updated.every((h) => h.completed)) {
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
      }
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
    setHabits((prev) => [...prev, newHabit]);
    setNewHabitName('');
    setShowAddForm(false);
    toast.success(`Habit "${newHabit.name}" added to daily matrix!`);
  };

  const removeHabit = (id: string, name: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    toast.info(`Removed "${name}" from matrix.`);
  };

  const handleFreezeDay = () => {
    setIsFrozen(true);
    // Trigger subtle snowflake canvas effect
    confetti({
      particleCount: 50,
      angle: 90,
      spread: 180,
      origin: { y: 0 },
      colors: ['#ffffff', '#bae6fd', '#e0f2fe'],
      shapes: ['circle'],
      ticks: 300,
      gravity: 0.4,
      scalar: 1.2,
    });
    toast.success('❄️ Streak Frozen! Your streak is safely shielded for today.', {
      icon: '🛡️',
    });
  };

  const completedCount = habits.filter((h) => h.completed).length;
  const progress = habits.length ? Math.round((completedCount / habits.length) * 100) : 0;

  return (
    <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
          <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
          <span>Daily Habit Matrix</span>
        </div>
        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
          {completedCount}/{habits.length} ({progress}%)
        </span>
      </div>

      {/* Habits List */}
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        <AnimatePresence>
          {habits.map((habit) => (
            <motion.div
              key={habit.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`group flex items-center justify-between p-2 rounded-lg border transition-all ${
                habit.completed
                  ? 'bg-purple-950/30 border-purple-500/30 text-slate-300'
                  : 'bg-slate-950/50 border-white/5 text-slate-200 hover:border-white/10'
              }`}
            >
              <button
                onClick={() => toggleHabit(habit.id)}
                className="flex items-center gap-2 text-left flex-1 min-w-0"
              >
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                    habit.completed
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'border-slate-600 group-hover:border-purple-400'
                  }`}
                >
                  {habit.completed && <span className="text-[10px] font-bold">✓</span>}
                </div>
                <span
                  className={`text-xs truncate ${
                    habit.completed ? 'line-through text-slate-400' : ''
                  }`}
                >
                  {habit.name}
                </span>
              </button>

              <button
                onClick={() => removeHabit(habit.id, habit.name)}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Habit Form Toggle */}
      {showAddForm ? (
        <form onSubmit={addHabit} className="flex items-center gap-1.5 pt-1">
          <Input
            type="text"
            placeholder="Habit name..."
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            className="h-8 text-xs bg-slate-950/80 border-white/10 text-white"
            autoFocus
          />
          <Button size="sm" type="submit" className="h-8 px-2.5 gradient-button text-xs">
            Add
          </Button>
          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={() => setShowAddForm(false)}
            className="h-8 px-2 text-xs text-slate-400"
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
            className="flex-1 h-7 text-[11px] bg-slate-950/50 hover:bg-slate-800 border-white/10 text-slate-300 gap-1 rounded-lg"
          >
            <Plus className="w-3 h-3" /> Add Habit
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={isFrozen}
            onClick={handleFreezeDay}
            className={`h-7 px-2.5 text-[11px] border-white/10 gap-1 rounded-lg ${
              isFrozen
                ? 'bg-cyan-950/50 text-cyan-300 border-cyan-500/30'
                : 'bg-slate-950/50 hover:bg-cyan-950/30 text-cyan-400 hover:text-cyan-200'
            }`}
          >
            <Snowflake className="w-3 h-3" />
            {isFrozen ? 'Frozen' : 'Freeze'}
          </Button>
        </div>
      )}
    </div>
  );
}
