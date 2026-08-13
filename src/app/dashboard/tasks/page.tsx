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
  Check,
  ArrowUp,
  ArrowDown,
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
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" /> Tasks & Sprints
          </h1>
          <p className="text-xs text-muted-foreground">Action items, goal breakdown, and completed history</p>
        </div>

        {/* Master History Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
          className="text-xs bg-card hover:bg-muted border-border text-foreground gap-1.5 rounded-md font-medium cursor-pointer h-8"
        >
          <History className="w-3.5 h-3.5 text-primary" />
          <span>{showHistory ? 'Hide History' : `History (${taskHistory.length})`}</span>
        </Button>
      </div>

      {/* AI Task Breakdown */}
      <div className="p-3.5 bg-card rounded-xl border border-border space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>AI Goal Breakdown</span>
        </div>
        <form onSubmit={handleAiBreakdown} className="flex gap-2">
          <Input
            type="text"
            placeholder="Type an objective (e.g. Study chapter 3, prepare client proposal)..."
            value={aiGoal}
            onChange={(e) => setAiGoal(e.target.value)}
            disabled={aiArchitectLoading}
            className="flex-1 bg-background border-border text-foreground text-xs rounded-md h-8 px-3"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!aiGoal.trim() || aiArchitectLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-3.5 h-8 rounded-md shrink-0 gap-1.5 font-medium cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>{aiArchitectLoading ? 'Generating...' : 'Break Down'}</span>
          </Button>
        </form>
      </div>

      {/* Master History Drawer */}
      {showHistory && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-3.5 bg-card rounded-xl border border-border space-y-2.5"
        >
          <div className="flex items-center justify-between text-xs font-medium text-foreground border-b border-border pb-2">
            <span className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-primary" />
              <span>Completed Task History ({taskHistory.length})</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">Synced with Logbook export</span>
          </div>

          {taskHistory.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No tasks completed yet. Complete tasks below to record history.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {taskHistory.map((h, i) => (
                <div
                  key={h.id || i}
                  className="p-2 bg-muted/40 rounded-lg border border-border/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-muted-foreground line-through font-medium">{h.task}</span>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5 font-mono">
                        <span>{h.time}</span>
                        <span>• Priority: {h.priority}</span>
                        {h.completedAt && <span>• {h.completedAt}</span>}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                    +5 XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Add Task Input Form */}
      <form onSubmit={handleAddTask} className="p-3.5 bg-card rounded-xl border border-border space-y-2.5">
        <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-primary" />
          <span>New Task</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="text"
            placeholder="What needs to get done?"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 bg-background border-border text-foreground text-xs rounded-md h-8 px-3"
          />

          <div className="flex gap-2">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as any)}
              className="bg-background border border-border text-foreground text-xs rounded-md px-2.5 h-8 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer font-medium"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <Input
              type="text"
              placeholder="25 mins"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-24 bg-background border-border text-foreground text-xs rounded-md h-8 px-2.5"
            />

            <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-3.5 h-8 rounded-md font-medium cursor-pointer">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add
            </Button>
          </div>
        </div>
      </form>

      {/* Active Tasks Progress & Alignment / Sorting Control Bar */}
      <div className="p-3.5 bg-card rounded-xl border border-border space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Active Tasks ({completedCount} / {tasks.length} Completed)</span>
          </div>

          {/* High to Low Alignment Button & Clear Finished */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSortHighToLow}
              title="Sort tasks by priority"
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer ${
                isSortedHighToLow
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted hover:bg-secondary text-foreground border-border'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Sort by Priority</span>
            </button>

            {completedCount > 0 && (
              <button
                onClick={clearCompleted}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors px-2 py-1 cursor-pointer font-medium"
              >
                <Trash2 className="w-3 h-3" /> Clear Finished
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
            className="h-full bg-primary"
          />
        </div>
      </div>

      {/* Active Tasks List */}
      <div className="space-y-1.5">
        {tasks.length === 0 ? (
          <div className="p-8 text-center bg-card rounded-xl border border-border space-y-2">
            <CheckSquare className="w-8 h-8 text-muted-foreground mx-auto" />
            <div className="text-xs text-muted-foreground">All clear! Add a task above or use AI Breakdown to plan your day.</div>
          </div>
        ) : (
          <AnimatePresence>
            {tasks.map((t, idx) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-3 rounded-xl border transition-colors flex items-center justify-between gap-3 group ${
                  t.done
                    ? 'bg-muted/30 border-border opacity-70'
                    : 'bg-card hover:bg-muted/30 border-border'
                }`}
              >
                {/* LEFT: Checkbox + Task Name + Time */}
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <button
                    onClick={() => toggleTask(t.id)}
                    className={`w-4 h-4 rounded flex items-center justify-center transition-colors border shrink-0 mt-0.5 cursor-pointer ${
                      t.done
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-muted-foreground/50 hover:border-primary bg-background'
                    }`}
                  >
                    {t.done && <Check className="w-3 h-3 text-white" />}
                  </button>

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div
                      className={`text-xs sm:text-sm font-medium leading-snug break-words ${
                        t.done ? 'line-through text-muted-foreground' : 'text-foreground'
                      }`}
                    >
                      {t.task}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
                      <Clock className="w-3 h-3 text-primary shrink-0" />
                      <span>{t.time}</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Priority Badge, Move Controls & Delete */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1.5 border ${
                      t.priority === 'High'
                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/40'
                        : t.priority === 'Medium'
                        ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        t.priority === 'High'
                          ? 'bg-red-500'
                          : t.priority === 'Medium'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <span>{t.priority}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => moveTask(idx, 'up')}
                    disabled={idx === 0}
                    className={`p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${
                      idx === 0 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveTask(idx, 'down')}
                    disabled={idx === tasks.length - 1}
                    className={`p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ${
                      idx === tasks.length - 1 ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => deleteTask(t.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded hover:bg-destructive/10 transition-all cursor-pointer"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
