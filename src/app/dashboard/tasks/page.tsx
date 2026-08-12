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
  ChevronUp,
  ChevronDown,
  Flame,
  ArrowUpDown,
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
  const [isSortedHighToLow, setIsSortedHighToLow] = useState(false);

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
    const targetTask = tasks.find((t) => t.id === id);
    if (!targetTask) return;

    const willBeDone = !targetTask.done;
    const updated = tasks.map((t) => (t.id === id ? { ...t, done: willBeDone } : t));
    saveTasks(updated);

    recordMasterTask(userId, {
      id: targetTask.id,
      task: targetTask.task,
      priority: targetTask.priority,
      time: targetTask.time,
      done: willBeDone,
    });
    refreshHistory(userId);

    if (willBeDone) {
      addXP(userId, 5);
      logTaskCompletion(userId, {
        id: targetTask.id,
        task: targetTask.task,
        priority: targetTask.priority,
        time: targetTask.time,
      });
      toast.success(`Completed: ${targetTask.task} (+5 XP)`, { icon: '🎯' });
    } else {
      addXP(userId, -5);
      toast.info(`Task reopened: ${targetTask.task} (-5 XP)`);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      task: newTaskTitle.trim(),
      priority: newPriority,
      time: newTime || '25 mins',
      done: false,
    };

    const updated = [newTask, ...tasks];
    saveTasks(updated);
    recordMasterTask(userId, newTask);
    refreshHistory(userId);

    setNewTaskTitle('');
    setNewTime('25 mins');
    toast.success('Task created and logged to Master Database!');
  };

  const deleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    saveTasks(updated);
  };

  const clearCompleted = () => {
    const updated = tasks.filter((t) => !t.done);
    saveTasks(updated);
    toast.info('Cleared finished tasks.');
  };

  // Move task manual swap
  const moveTask = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= tasks.length) return;

    const updated = [...tasks];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    saveTasks(updated);
    setIsSortedHighToLow(false);
  };

  // Sort from High to Low priority
  const handleSortHighToLow = () => {
    const priorityWeight = { High: 3, Medium: 2, Low: 1 };
    const sorted = [...tasks].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });
    saveTasks(sorted);
    setIsSortedHighToLow(true);
    toast.success('Tasks sorted: High ➔ Medium ➔ Low! ⚡');
  };

  // AI Task Architect Breakdown
  const handleAiBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiGoal.trim() || aiArchitectLoading) return;

    setAiArchitectLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'groq',
          messages: [
            {
              role: 'user',
              content: `Deconstruct the following high-level objective into exactly 4 concrete, actionable micro-tasks for today's execution plan. Return ONLY a valid JSON array of objects with keys: "task" (string, max 8 words), "priority" ("High" | "Medium" | "Low"), "time" (string e.g. "20 mins", "30 mins").
Objective: "${aiGoal}"`,
            },
          ],
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
          <h1 className="text-xl font-bold text-slate-900 dark:gradient-text flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-purple-400" /> Action Sprints & Task Planner
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Micro-task execution engine with automated Master Database persistence</p>
        </div>

        {/* Master History Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
          className="text-xs bg-white hover:bg-slate-100 dark:bg-slate-900/80 dark:hover:bg-slate-800 border-slate-200 dark:border-white/10 text-indigo-600 dark:text-cyan-300 gap-1.5 rounded-lg shadow-sm cursor-pointer"
        >
          <History className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" />
          <span>{showHistory ? 'Hide History' : `Master Database (${taskHistory.length})`}</span>
        </Button>
      </div>

      {/* AI Task Architect */}
      <div className="p-4 bg-white dark:bg-gradient-to-r dark:from-purple-950/40 dark:via-slate-900/60 dark:to-indigo-950/40 rounded-xl border border-slate-200/80 dark:border-purple-500/20 space-y-2.5 shadow-sm">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-purple-300">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-purple-400" />
          <span>AI Task Architect & Goal Breakdown</span>
        </div>
        <form onSubmit={handleAiBreakdown} className="flex gap-2">
          <Input
            type="text"
            placeholder="Type any big goal (e.g., 'Study machine learning chapter 3', 'Complete client design')..."
            value={aiGoal}
            onChange={(e) => setAiGoal(e.target.value)}
            disabled={aiArchitectLoading}
            className="flex-1 bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs shadow-sm"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!aiGoal.trim() || aiArchitectLoading}
            className="bg-slate-900 hover:bg-slate-800 text-white dark:gradient-button text-xs px-4 rounded-lg shrink-0 gap-1.5 shadow-sm cursor-pointer"
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
          className="p-4 bg-white dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-cyan-500/30 space-y-3 shadow-md"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-cyan-300 border-b border-slate-100 dark:border-white/5 pb-2">
            <span className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
              <span>Permanent Completed Tasks History ({taskHistory.length})</span>
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Synced with Excel Life Audit</span>
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
                  className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-lg border border-slate-200/80 dark:border-white/5 flex items-center justify-between text-xs shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="text-slate-700 dark:text-slate-200 line-through decoration-slate-400 font-medium">{h.task}</span>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5 text-indigo-600 dark:text-cyan-400" /> {h.completedAt}
                        </span>
                        <span>•</span>
                        <span>{h.time}</span>
                        <span>•</span>
                        <span className="text-indigo-600 dark:text-purple-400 font-semibold">{h.priority} Priority</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 px-2 py-0.5 rounded font-mono font-semibold">
                    +5 XP Earned
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Add New Custom Task Form */}
      <form onSubmit={handleAddTask} className="p-4 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="text"
            placeholder="What micro-action will you tackle next?"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 text-xs shadow-sm"
          />

          <div className="flex gap-2">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm cursor-pointer font-medium"
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
              className="w-28 bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs shadow-sm"
            />

            <Button type="submit" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white dark:gradient-button text-xs px-4 rounded-lg shadow-sm cursor-pointer">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </div>
      </form>

      {/* Active Tasks Progress & Alignment / Sorting Control Bar */}
      <div className="p-4 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Active Sprint Tasks ({completedCount} / {tasks.length} Completed)</span>
          </div>

          {/* High to Low Alignment Button & Clear Finished */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSortHighToLow}
              title="Align tasks from High to Low priority"
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer ${
                isSortedHighToLow
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-purple-600 dark:border-purple-400 shadow-sm'
                  : 'bg-white hover:bg-slate-100 dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>High to Low</span>
            </button>

            {completedCount > 0 && (
              <button
                onClick={clearCompleted}
                className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors px-2 py-1 cursor-pointer font-medium"
              >
                <Trash2 className="w-3 h-3" /> Clear Finished
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-950 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-slate-900 dark:bg-gradient-to-r dark:from-purple-500 dark:to-cyan-400"
          />
        </div>
      </div>

      {/* Active Tasks List */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900/30 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-2 shadow-sm">
            <CheckSquare className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-xs text-slate-500">All clear! Add a task above or use AI Breakdown to plan your day.</div>
          </div>
        ) : (
          <AnimatePresence>
            {tasks.map((t, idx) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-3.5 sm:p-4 rounded-xl border transition-all flex items-center justify-between gap-3 group shadow-sm ${
                  t.done
                    ? 'bg-slate-50/90 dark:bg-slate-950/40 border-slate-200/60 dark:border-emerald-500/20 opacity-70'
                    : 'bg-white hover:bg-slate-50/80 dark:bg-slate-900/60 dark:hover:bg-slate-900/90 border-slate-200/80 dark:border-white/5 hover:border-slate-300'
                }`}
              >
                {/* LEFT: Radio Checkbox + Task Name (Line 1) + Time (Line 2 Below Name) */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => toggleTask(t.id)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors border shrink-0 mt-0.5 cursor-pointer ${
                      t.done
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 dark:border-white/30 hover:border-indigo-600 dark:hover:border-purple-400 bg-white dark:bg-transparent'
                    }`}
                  >
                    {t.done && <CheckSquare className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Line 1: Task Title */}
                    <div
                      className={`text-xs sm:text-sm font-medium leading-snug break-words ${
                        t.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-200'
                      }`}
                    >
                      {t.task}
                    </div>

                    {/* Line 2: Estimated Time Below Task Name */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-cyan-300 font-mono">
                      <Clock className="w-3 h-3 text-indigo-600 dark:text-cyan-400 shrink-0" />
                      <span>{t.time}</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Priority Badge, Swap Up/Down Controls & Delete */}
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {/* Priority Badge */}
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 shadow-sm ${
                      t.priority === 'High'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-500/40'
                        : t.priority === 'Medium'
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/40'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500/40'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        t.priority === 'High'
                          ? 'bg-rose-600 dark:bg-red-400'
                          : t.priority === 'Medium'
                          ? 'bg-amber-600 dark:bg-amber-400'
                          : 'bg-emerald-600 dark:bg-emerald-400'
                      }`}
                    />
                    <span>{t.priority}</span>
                  </span>

                  {/* Manual Swap Up / Down Buttons */}
                  <div className="flex flex-col bg-slate-100 dark:bg-slate-950/70 p-0.5 rounded-lg border border-slate-200 dark:border-white/5 opacity-80 group-hover:opacity-100 transition-opacity shadow-sm">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveTask(idx, 'up')}
                      className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-cyan-300 disabled:opacity-20 transition-colors cursor-pointer"
                      title="Move task up"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === tasks.length - 1}
                      onClick={() => moveTask(idx, 'down')}
                      className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-cyan-300 disabled:opacity-20 transition-colors cursor-pointer"
                      title="Move task down"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 transition-all ml-0.5 cursor-pointer"
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
