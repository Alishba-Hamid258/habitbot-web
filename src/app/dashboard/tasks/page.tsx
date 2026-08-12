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
          <h1 className="text-lg font-bold text-[#202124] dark:text-[#e8eaed] flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#1a73e8]" /> Action Sprints & Tasks
          </h1>
          <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">Micro-task execution engine with automated Master Database persistence</p>
        </div>

        {/* Master History Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
          className="text-xs bg-white hover:bg-[#f1f3f4] dark:bg-[#1e1e1e] dark:hover:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#1a73e8] dark:text-[#8ab4f8] gap-1.5 rounded-full font-medium cursor-pointer"
        >
          <History className="w-3.5 h-3.5" />
          <span>{showHistory ? 'Hide History' : `Master Database (${taskHistory.length})`}</span>
        </Button>
      </div>

      {/* AI Task Architect */}
      <div className="p-4 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[#202124] dark:text-[#e8eaed]">
          <Sparkles className="w-4 h-4 text-[#1a73e8]" />
          <span>AI Task Architect & Goal Breakdown</span>
        </div>
        <form onSubmit={handleAiBreakdown} className="flex gap-2">
          <Input
            type="text"
            placeholder="Type any big goal (e.g., 'Study machine learning chapter 3', 'Complete client design')..."
            value={aiGoal}
            onChange={(e) => setAiGoal(e.target.value)}
            disabled={aiArchitectLoading}
            className="flex-1 bg-[#f8f9fa] dark:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] text-xs rounded-full px-4"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!aiGoal.trim() || aiArchitectLoading}
            className="bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs px-4 rounded-full shrink-0 gap-1.5 font-medium shadow-none cursor-pointer"
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
          className="p-4 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] space-y-3"
        >
          <div className="flex items-center justify-between text-xs font-medium text-[#202124] dark:text-[#e8eaed] border-b border-[#dadce0] dark:border-[#3c4043] pb-2">
            <span className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#1a73e8]" />
              <span>Permanent Completed Tasks History ({taskHistory.length})</span>
            </span>
            <span className="text-[10px] text-[#5f6368] dark:text-[#9aa0a6] font-mono">Synced with Excel Life Audit</span>
          </div>

          {taskHistory.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#5f6368] dark:text-[#9aa0a6]">
              No tasks completed yet. Complete tasks below to record your permanent action history!
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {taskHistory.map((h, i) => (
                <div
                  key={h.id || i}
                  className="p-2.5 bg-[#f8f9fa] dark:bg-[#2d2e30] rounded-xl border border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1e8e3e] shrink-0" />
                    <div>
                      <span className="text-[#5f6368] dark:text-[#9aa0a6] line-through font-medium">{h.task}</span>
                      <div className="text-[10px] text-[#5f6368] dark:text-[#9aa0a6] flex items-center gap-2 mt-0.5 font-mono">
                        <span>🕒 {h.time}</span>
                        <span>• Priority: {h.priority}</span>
                        {h.completedAt && <span>• Completed: {h.completedAt}</span>}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-[#1e8e3e] bg-[#e6f4ea] dark:bg-[#1a3826] px-2 py-0.5 rounded-full font-semibold">
                    +5 XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Add Task Input Form */}
      <form onSubmit={handleAddTask} className="p-4 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] space-y-3">
        <div className="text-xs font-medium text-[#202124] dark:text-[#e8eaed] flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-[#1a73e8]" />
          <span>Add New Action Task</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="text"
            placeholder="What needs to get done right now?"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="flex-1 bg-[#f8f9fa] dark:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] text-xs rounded-full px-4"
          />

          <div className="flex gap-2">
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as any)}
              className="bg-[#f8f9fa] dark:bg-[#2d2e30] border border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] text-xs rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a73e8] cursor-pointer font-medium"
            >
              <option value="High">🔴 High</option>
              <option value="Medium">🟡 Medium</option>
              <option value="Low">🟢 Low</option>
            </select>

            <Input
              type="text"
              placeholder="Est: 25 mins"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="w-28 bg-[#f8f9fa] dark:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] text-xs rounded-full px-3"
            />

            <Button type="submit" size="sm" className="bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs px-4 rounded-full font-medium shadow-none cursor-pointer">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </div>
      </form>

      {/* Active Tasks Progress & Alignment / Sorting Control Bar */}
      <div className="p-4 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-medium text-[#202124] dark:text-[#e8eaed]">
            <CheckCircle2 className="w-4 h-4 text-[#1e8e3e]" />
            <span>Active Tasks ({completedCount} / {tasks.length} Completed)</span>
          </div>

          {/* High to Low Alignment Button & Clear Finished */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSortHighToLow}
              title="Align tasks from High to Low priority"
              className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                isSortedHighToLow
                  ? 'bg-[#1a73e8] text-white'
                  : 'bg-[#f1f3f4] hover:bg-[#e8eaed] dark:bg-[#2d2e30] dark:hover:bg-[#3c4043] text-[#202124] dark:text-[#e8eaed]'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-[#e37400]" />
              <span>High to Low</span>
            </button>

            {completedCount > 0 && (
              <button
                onClick={clearCompleted}
                className="text-xs text-[#5f6368] hover:text-[#d93025] flex items-center gap-1 transition-colors px-2 py-1 cursor-pointer font-medium"
              >
                <Trash2 className="w-3 h-3" /> Clear Finished
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#e8eaed] dark:bg-[#2d2e30] rounded-full h-1.5 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
            className="h-full bg-[#1a73e8] dark:bg-[#8ab4f8]"
          />
        </div>
      </div>

      {/* Active Tasks List */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] space-y-2">
            <CheckSquare className="w-8 h-8 text-[#5f6368] mx-auto" />
            <div className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">All clear! Add a task above or use AI Breakdown to plan your day.</div>
          </div>
        ) : (
          <AnimatePresence>
            {tasks.map((t, idx) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-colors flex items-center justify-between gap-3 group ${
                  t.done
                    ? 'bg-[#f8f9fa] dark:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] opacity-75'
                    : 'bg-white hover:bg-[#f8f9fa] dark:bg-[#1e1e1e] dark:hover:bg-[#252629] border-[#dadce0] dark:border-[#3c4043]'
                }`}
              >
                {/* LEFT: Radio Checkbox + Task Name (Line 1) + Time (Line 2 Below Name) */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => toggleTask(t.id)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors border-2 shrink-0 mt-0.5 cursor-pointer ${
                      t.done
                        ? 'bg-[#1e8e3e] border-[#1e8e3e] text-white'
                        : 'border-[#5f6368] dark:border-[#9aa0a6] hover:border-[#1a73e8] bg-white dark:bg-transparent'
                    }`}
                  >
                    {t.done && <Check className="w-3 h-3 text-white" />}
                  </button>

                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Line 1: Task Title */}
                    <div
                      className={`text-xs sm:text-sm font-medium leading-snug break-words ${
                        t.done ? 'line-through text-[#5f6368] dark:text-[#9aa0a6]' : 'text-[#202124] dark:text-[#e8eaed]'
                      }`}
                    >
                      {t.task}
                    </div>

                    {/* Line 2: Estimated Time Below Task Name */}
                    <div className="flex items-center gap-1.5 text-[11px] text-[#5f6368] dark:text-[#9aa0a6] font-mono">
                      <Clock className="w-3 h-3 text-[#1a73e8] shrink-0" />
                      <span>{t.time}</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Priority Badge, Swap Up/Down Controls & Delete */}
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {/* Priority Badge */}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1.5 ${
                      t.priority === 'High'
                        ? 'bg-[#fce8e6] text-[#c5221f] dark:bg-[#3c2020] dark:text-[#f28b82]'
                        : t.priority === 'Medium'
                        ? 'bg-[#fef7e0] text-[#b06000] dark:bg-[#3c3010] dark:text-[#fdd663]'
                        : 'bg-[#e6f4ea] text-[#137333] dark:bg-[#1a3826] dark:text-[#81c995]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        t.priority === 'High'
                          ? 'bg-[#d93025]'
                          : t.priority === 'Medium'
                          ? 'bg-[#f9ab00]'
                          : 'bg-[#1e8e3e]'
                      }`}
                    />
                    <span>{t.priority}</span>
                  </span>

                  {/* Move UP Swap Button */}
                  <button
                    type="button"
                    onClick={() => moveTask(idx, 'up')}
                    disabled={idx === 0}
                    className={`p-1.5 rounded-full transition-colors ${
                      idx === 0
                        ? 'opacity-20 cursor-not-allowed text-[#5f6368]'
                        : 'text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] cursor-pointer'
                    }`}
                    title="Swap with task above (Move Up)"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Move DOWN Swap Button */}
                  <button
                    type="button"
                    onClick={() => moveTask(idx, 'down')}
                    disabled={idx === tasks.length - 1}
                    className={`p-1.5 rounded-full transition-colors ${
                      idx === tasks.length - 1
                        ? 'opacity-20 cursor-not-allowed text-[#5f6368]'
                        : 'text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] cursor-pointer'
                    }`}
                    title="Swap with task below (Move Down)"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Task Button */}
                  <button
                    onClick={() => deleteTask(t.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#5f6368] hover:text-[#d93025] p-1.5 rounded-full hover:bg-[#fce8e6] dark:hover:bg-[#3c2020] transition-all cursor-pointer"
                    title="Delete task from sprint (Preserved in Master DB)"
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
