'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Plus, Trash2, Sparkles, CheckCircle2, Clock, History, Calendar, ArrowUpRight } from 'lucide-react';
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

    if (target?.done) {
      addXP(userId, 5);
      logTaskCompletion(userId, {
        id: target.id,
        task: target.task,
        priority: target.priority,
        time: target.time,
      });
      refreshHistory(userId);
      toast.success(`Completed: "${target.task}" (+5 XP recorded to history)`, { icon: '✅' });
    } else {
      toast.info(`Re-opened: "${target?.task}"`);
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
    setNewTaskTitle('');
    toast.success('Task added successfully!');
  };

  const deleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    saveTasks(updated);
    toast.info('Task removed from active list.');
  };

  const clearCompleted = () => {
    // Preserve in history before clearing active view
    tasks.filter((t) => t.done).forEach((t) => {
      logTaskCompletion(userId, {
        id: t.id,
        task: t.task,
        priority: t.priority,
        time: t.time,
      });
    });
    refreshHistory(userId);

    const updated = tasks.filter((t) => !t.done);
    saveTasks(updated);
    toast.info('Cleared finished tasks. (All permanently preserved in History & Excel)!');
  };

  const handleAiBreakdown = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiGoal.trim() || aiArchitectLoading) return;

    setAiArchitectLoading(true);

    setTimeout(() => {
      setAiArchitectLoading(false);
      const generated: Task[] = [
        { id: (Date.now() + 1).toString(), task: `Step 1: Outline milestone strategy for "${aiGoal}"`, priority: 'High', time: '20 mins', done: false },
        { id: (Date.now() + 2).toString(), task: `Step 2: Remove friction and gather all reference materials`, priority: 'Medium', time: '15 mins', done: false },
        { id: (Date.now() + 3).toString(), task: `Step 3: Execute initial 25-minute deep work focus block`, priority: 'High', time: '25 mins', done: false },
        { id: (Date.now() + 4).toString(), task: `Step 4: Review output & log reflection in HabitBot`, priority: 'Low', time: '10 mins', done: false },
      ];

      const updated = [...generated, ...tasks];
      saveTasks(updated);
      setAiGoal('');
      toast.success(`✨ AI Task Architect broke down goal into 4 actionable steps!`);
    }, 1000);
  };

  const completedCount = tasks.filter((t) => t.done).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-purple-400" /> Daily Action Engine & Task Planner
          </h1>
          <p className="text-xs text-slate-400">Micro-action execution with AI Task Breakdown and permanent progress ledger</p>
        </div>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900/80 border border-white/10 text-cyan-300 hover:text-white hover:bg-slate-800 transition-all max-w-fit"
        >
          <History className="w-3.5 h-3.5 text-cyan-400" />
          <span>{showHistory ? 'Hide History' : `Task History (${taskHistory.length})`}</span>
        </button>
      </div>

      {/* AI Task Architect Card */}
      <div className="p-4 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-cyan-950/40 rounded-xl border border-purple-500/20 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>AI Task Architect — Break Any Daunting Goal into 4 Micro-Steps</span>
        </div>
        <form onSubmit={handleAiBreakdown} className="flex gap-2">
          <Input
            type="text"
            placeholder="e.g. Launch my portfolio website, Write chapter 1 of book, Prepare tax audit..."
            value={aiGoal}
            onChange={(e) => setAiGoal(e.target.value)}
            className="flex-1 bg-slate-950/80 border-white/10 text-white placeholder:text-slate-500 text-xs"
          />
          <Button
            type="submit"
            disabled={aiArchitectLoading}
            className="gradient-button text-xs px-4 rounded-lg flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{aiArchitectLoading ? 'Generating...' : 'Break Down'}</span>
          </Button>
        </form>
      </div>

      {/* PERMANENT TASK HISTORY DRAWER */}
      {showHistory && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="p-4 bg-slate-900/80 rounded-xl border border-cyan-500/30 space-y-3"
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

      {/* Active Tasks Progress & Actions Bar */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Active Sprint Tasks ({completedCount} / {tasks.length} Completed)</span>
          </div>

          {completedCount > 0 && (
            <button
              onClick={clearCompleted}
              className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Clear Finished
            </button>
          )}
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

      {/* Active Tasks List */}
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between group ${
                  t.done
                    ? 'bg-slate-950/40 border-emerald-500/20 opacity-60'
                    : 'bg-slate-900/60 border-white/5 hover:border-purple-500/30'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => toggleTask(t.id)}
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors border ${
                      t.done
                        ? 'bg-emerald-500 border-emerald-400 text-white'
                        : 'border-white/20 hover:border-purple-400'
                    }`}
                  >
                    {t.done && <CheckSquare className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div
                      className={`text-xs font-medium truncate ${
                        t.done ? 'line-through text-slate-500' : 'text-slate-200'
                      }`}
                    >
                      {t.task}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                      <span
                        className={`font-semibold ${
                          t.priority === 'High'
                            ? 'text-red-400'
                            : t.priority === 'Medium'
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {t.priority}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {t.time}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-950/30 text-slate-500 hover:text-red-400 transition-all"
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
