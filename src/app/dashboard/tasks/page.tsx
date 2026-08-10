'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  Clock,
  History,
  Calendar,
  Shuffle,
  ArrowUpDown,
  Flame,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  getActiveUser,
  getUserScopedData,
  setUserScopedData,
  addXP,
  logTaskCompletion,
  getTaskHistory,
  recordMasterTask,
  TaskHistoryItem,
} from '@/lib/auth-storage';

interface Task {
  id: string;
  task: string;
  priority: 'High' | 'Medium' | 'Low';
  time: string;
  done: boolean;
}

type SortFilter = 'default' | 'high-to-low' | 'random';

const DEFAULT_TASKS: Task[] = [
  { id: '1', task: 'Design Next.js App Router components', priority: 'High', time: '45 mins', done: false },
  { id: '2', task: 'Wire Supabase PostgreSQL database schemas', priority: 'High', time: '30 mins', done: false },
  { id: '3', task: 'Review Atomic Habits chapter 4 (Cue design)', priority: 'Medium', time: '20 mins', done: false },
  { id: '4', task: '15-minute evening review and reflection', priority: 'Low', time: '15 mins', done: false },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskHistory, setTaskHistory] = useState<TaskHistoryItem[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newTime, setNewTime] = useState('25 mins');
  const [userId, setUserId] = useState<number>(1);
  const [showHistory, setShowHistory] = useState(false);
  const [activeSort, setActiveSort] = useState<SortFilter>('default');

  const [aiGoal, setAiGoal] = useState('');
  const [aiArchitectLoading, setAiArchitectLoading] = useState(false);

  const refreshHistory = (uid: number) => {
    const hist = getTaskHistory(uid);
    setTaskHistory(hist);
  };

  useEffect(() => {
    const active = getActiveUser();
    if (active) {
      setUserId(active.id);
      const defaultInitial = active.id === 1 ? DEFAULT_TASKS : [];
      const userTasks = getUserScopedData<Task[]>(active.id, 'tasks', defaultInitial);
      setTasks(userTasks);
      refreshHistory(active.id);
    }
  }, []);

  const saveTasks = (updated: Task[]) => {
    setTasks(updated);
    setUserScopedData(userId, 'tasks', updated);
  };

  const toggleTask = (id: string) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    const target = updated.find((t) => t.id === id);
    saveTasks(updated);

    if (target) {
      recordMasterTask(userId, {
        id: target.id,
        task: target.task,
        priority: target.priority,
        time: target.time,
        done: target.done,
      });
      refreshHistory(userId);

      if (target.done) {
        addXP(userId, 5);
        toast.success(`Completed: "${target.task}" (+5 XP saved to master DB)`, { icon: '✅' });
      } else {
        toast.info(`Re-opened: "${target.task}"`);
      }
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      task: newTaskTitle.trim(),
      priority: newPriority,
      time: newTime.trim() || '25 mins',
      done: false,
    };

    const updated = [newTask, ...tasks];
    saveTasks(updated);
    recordMasterTask(userId, newTask);
    refreshHistory(userId);

    setNewTaskTitle('');
    toast.success(`Task "${newTask.task}" added to sprint & master DB!`);
  };

  const deleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    saveTasks(updated);
    toast.info('Task removed from active sprint (preserved in master DB)');
  };

  const clearCompleted = () => {
    const updated = tasks.filter((t) => !t.done);
    saveTasks(updated);
    toast.info('Completed sprint tasks archived.');
  };

  // High to Low Priority Sorting
  const handleSortHighToLow = () => {
    setActiveSort('high-to-low');
    const priorityWeight = { High: 3, Medium: 2, Low: 1 };
    const sorted = [...tasks].sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
    saveTasks(sorted);
    toast.success('Tasks sorted: High 🔴 ➡️ Medium 🟡 ➡️ Low 🟢 Priority!');
  };

  // Random Placement / Shuffle Tasks
  const handleRandomShuffle = () => {
    setActiveSort('random');
    const shuffled = [...tasks].sort(() => Math.random() - 0.5);
    saveTasks(shuffled);
    toast.success('Randomized task placement! 🔀');
  };

  // AI Breakdown Engine
  const handleAiBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiGoal.trim()) return;

    setAiArchitectLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Break down this big goal into exactly 4 concrete, actionable micro-tasks for today using atomic habit principles: "${aiGoal.trim()}". Return ONLY a raw JSON array of 4 objects with keys: "task" (string description starting with Step 1, Step 2, etc.), "priority" (strictly "High", "Medium", or "Low"), and "time" (e.g. "20 mins", "15 mins", "25 mins"). Do not output any markdown ticks, preamble, or commentary.`,
            },
          ],
          provider: 'groq',
        }),
      });

      if (!res.ok) throw new Error('AI breakdown request failed');

      const text = await res.text();
      let cleaned = text.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
      }

      let parsed: { task: string; priority: 'High' | 'Medium' | 'Low'; time: string }[] = [];
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = [
          { task: `Step 1: Outline milestone strategy for "${aiGoal.trim()}"`, priority: 'High', time: '20 mins' },
          { task: `Step 2: Remove friction and gather all reference materials`, priority: 'Medium', time: '15 mins' },
          { task: `Step 3: Execute initial 25-minute deep work focus block`, priority: 'High', time: '25 mins' },
          { task: `Step 4: Review output & log reflection in HabitBot`, priority: 'Low', time: '10 mins' },
        ];
      }

      const generatedTasks: Task[] = parsed.map((item, idx) => ({
        id: (Date.now() + idx).toString(),
        task: item.task,
        priority: item.priority || 'Medium',
        time: item.time || '25 mins',
        done: false,
      }));

      const updated = [...generatedTasks, ...tasks];
      saveTasks(updated);

      generatedTasks.forEach((gt) => recordMasterTask(userId, gt));
      refreshHistory(userId);

      setAiGoal('');
      toast.success(`⚡ AI Action Architect generated 4 micro-tasks for "${aiGoal}"!`);
    } catch (err: any) {
      toast.error('Could not generate breakdown. Please try again.');
    } finally {
      setAiArchitectLoading(false);
    }
  };

  const completedCount = tasks.filter((t) => t.done).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-purple-400" /> Action Sprints & Task Planner
          </h1>
          <p className="text-xs text-slate-400">Micro-task execution engine with automated Master Database persistence</p>
        </div>

        {/* Master History Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
          className="text-xs bg-slate-900/80 hover:bg-slate-800 border-white/10 text-cyan-300 gap-1.5 rounded-lg shadow-sm"
        >
          <History className="w-3.5 h-3.5 text-cyan-400" />
          <span>{showHistory ? 'Hide History' : `Master Database (${taskHistory.length})`}</span>
        </Button>
      </div>

      {/* AI Task Architect */}
      <div className="p-4 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-indigo-950/40 rounded-xl border border-purple-500/20 space-y-2.5 shadow-lg">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>AI Task Architect & Goal Breakdown</span>
        </div>
        <form onSubmit={handleAiBreakdown} className="flex gap-2">
          <Input
            type="text"
            placeholder="Type any big goal (e.g., 'Study machine learning chapter 3', 'Complete client design')..."
            value={aiGoal}
            onChange={(e) => setAiGoal(e.target.value)}
            disabled={aiArchitectLoading}
            className="flex-1 bg-slate-950/80 border-white/10 text-white placeholder:text-slate-500 text-xs"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!aiGoal.trim() || aiArchitectLoading}
            className="gradient-button text-xs px-4 rounded-lg shrink-0 gap-1.5 shadow-md shadow-purple-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{aiArchitectLoading ? 'Deconstructing...' : 'Break Down'}</span>
          </Button>
        </form>
      </div>

      {/* Master History Drawer */}
      {showHistory && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 bg-slate-900/80 rounded-xl border border-cyan-500/30 space-y-3 shadow-xl"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-cyan-300 border-b border-white/5 pb-2">
            <span className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-cyan-400" />
              <span>Permanent Completed Tasks History ({taskHistory.length})</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Synced with Excel Life Audit</span>
          </div>

          {taskHistory.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              No tasks completed yet. Complete tasks below to record your permanent action history!
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {taskHistory.map((h, i) => (
                <div
                  key={h.id || i}
                  className="p-2.5 bg-slate-950/60 rounded-lg border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-slate-200 line-through decoration-slate-500 font-medium">{h.task}</span>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5 text-cyan-400" /> {h.completedAt}
                        </span>
                        <span>•</span>
                        <span>{h.time}</span>
                        <span>•</span>
                        <span className="text-purple-400 font-semibold">{h.priority} Priority</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                    +5 XP Earned
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Add New Custom Task Form */}
      <form onSubmit={handleAddTask} className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="text"
            placeholder="What micro-action will you tackle next?"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 bg-slate-950/80 border-white/10 text-white placeholder:text-slate-500 text-xs"
          />

          <div className="flex gap-2">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as any)}
              className="bg-slate-950/80 border border-white/10 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="High">🔴 High Priority</option>
              <option value="Medium">🟡 Medium Priority</option>
              <option value="Low">🟢 Low Priority</option>
            </select>

            <Input
              type="text"
              placeholder="Est: 25 mins"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-28 bg-slate-950/80 border-white/10 text-white text-xs"
            />

            <Button type="submit" size="sm" className="gradient-button text-xs px-4 rounded-lg">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </div>
      </form>

      {/* Active Tasks Progress & Alignment / Sorting Control Bar */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Active Sprint Tasks ({completedCount} / {tasks.length} Completed)</span>
          </div>

          {/* Alignment & Random Placement Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSortHighToLow}
              title="Align tasks from High to Low priority"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                activeSort === 'high-to-low'
                  ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                  : 'bg-slate-950/60 text-slate-300 hover:text-white border-white/10'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-red-400" />
              <span>High to Low</span>
            </button>

            <button
              type="button"
              onClick={handleRandomShuffle}
              title="Randomly shuffle task placement"
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                activeSort === 'random'
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-md'
                  : 'bg-slate-950/60 text-slate-300 hover:text-white border-white/10'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5 text-cyan-400" />
              <span>Random Shuffle</span>
            </button>

            {completedCount > 0 && (
              <button
                onClick={clearCompleted}
                className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors px-2 py-1"
              >
                <Trash2 className="w-3 h-3" /> Clear Finished
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-gradient-to-r from-purple-500 to-cyan-400"
          />
        </div>
      </div>

      {/* Active Tasks List — Formatted: Name (Left) | Time (Mid) | Priority (Right) */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/30 rounded-xl border border-white/5 space-y-2">
            <CheckSquare className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-xs text-slate-400">All clear! Add a task above or use AI Breakdown to plan your day.</div>
          </div>
        ) : (
          <AnimatePresence>
            {tasks.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all flex items-center justify-between gap-3 group ${
                  t.done
                    ? 'bg-slate-950/40 border-emerald-500/20 opacity-60'
                    : 'bg-slate-900/60 border-white/5 hover:border-purple-500/30 shadow-sm'
                }`}
              >
                {/* LEFT: Radio Checkbox + Task Name */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => toggleTask(t.id)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors border shrink-0 ${
                      t.done
                        ? 'bg-emerald-500 border-emerald-400 text-white'
                        : 'border-white/30 hover:border-purple-400'
                    }`}
                  >
                    {t.done && <CheckSquare className="w-3.5 h-3.5" />}
                  </button>

                  <span
                    className={`text-xs sm:text-sm font-medium truncate ${
                      t.done ? 'line-through text-slate-500' : 'text-slate-200'
                    }`}
                    title={t.task}
                  >
                    {t.task}
                  </span>
                </div>

                {/* MID: Task Estimated Time */}
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono px-3 py-1 bg-slate-950/60 rounded-lg border border-white/5 shrink-0 hidden sm:flex">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{t.time}</span>
                </div>

                {/* RIGHT: Priority Badge & Delete Action */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Time indicator for mobile screens */}
                  <span className="text-[10px] text-slate-400 font-mono sm:hidden flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> {t.time}
                  </span>

                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 shadow-sm ${
                      t.priority === 'High'
                        ? 'bg-red-950/60 text-red-300 border-red-500/40'
                        : t.priority === 'Medium'
                        ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        t.priority === 'High'
                          ? 'bg-red-400'
                          : t.priority === 'Medium'
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <span>{t.priority}</span>
                  </span>

                  <button
                    onClick={() => deleteTask(t.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-950/30 text-slate-500 hover:text-red-400 transition-all ml-1"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
