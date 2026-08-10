'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, Plus, Trash2, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getActiveUser, getUserScopedData, setUserScopedData } from '@/lib/auth-storage';

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
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newTime, setNewTime] = useState('25 mins');
  const [userId, setUserId] = useState<number>(1);

  const [aiGoal, setAiGoal] = useState('');
  const [aiArchitectLoading, setAiArchitectLoading] = useState(false);

  useEffect(() => {
    const active = getActiveUser();
    if (active) {
      setUserId(active.id);
      const userTasks = getUserScopedData<Task[]>(active.id, 'tasks', DEFAULT_TASKS);
      setTasks(userTasks);
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
      toast.success(`Completed: "${target.task}" (+5 XP)`, { icon: '✅' });
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
    toast.info('Task deleted.');
  };

  const clearCompleted = () => {
    const updated = tasks.filter((t) => !t.done);
    saveTasks(updated);
    toast.info('Cleared all completed tasks.');
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
    }, 1200);
  };

  const completedCount = tasks.filter((t) => t.done).length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-purple-400" /> Tasks & Action Architecture
          </h1>
          <p className="text-xs text-slate-400">Transform high-level goals into daily atomic action items</p>
        </div>

        {completedCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={clearCompleted}
            className="text-xs bg-slate-900/60 border-white/10 text-slate-400 hover:text-red-400 rounded-lg"
          >
            Clear Finished ({completedCount})
          </Button>
        )}
      </div>

      {/* AI Task Architect Generator */}
      <div className="p-4 bg-gradient-to-r from-purple-950/30 via-indigo-950/30 to-slate-900/60 rounded-xl border border-purple-500/20 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>⚡ AI Task Architect: Goal Breakdown</span>
        </div>

        <form onSubmit={handleAiBreakdown} className="flex gap-2">
          <Input
            type="text"
            placeholder="Type any goal (e.g. 'Build a modern portfolio website', 'Prepare for exam')..."
            value={aiGoal}
            onChange={(e) => setAiGoal(e.target.value)}
            className="flex-1 bg-slate-950/80 border-white/10 text-white text-xs"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!aiGoal.trim() || aiArchitectLoading}
            className="gradient-button text-xs px-4 rounded-lg shadow-md shadow-purple-500/20"
          >
            {aiArchitectLoading ? 'Generating Steps...' : 'Deconstruct Goal'}
          </Button>
        </form>
      </div>

      {/* Manual Task Creator */}
      <form onSubmit={handleAddTask} className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
        <div className="text-xs font-semibold text-slate-300">➕ Add Custom Task</div>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <Input
            type="text"
            placeholder="What needs to be done today?"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            className="sm:col-span-6 bg-slate-950/80 border-white/10 text-white text-xs"
          />

          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as 'High' | 'Medium' | 'Low')}
            className="sm:col-span-3 bg-slate-950/80 border border-white/10 text-xs text-white rounded-lg px-2 py-1.5 focus:outline-none"
          >
            <option value="High">🔥 High Priority</option>
            <option value="Medium">⚡ Medium Priority</option>
            <option value="Low">🌱 Low Priority</option>
          </select>

          <Input
            type="text"
            placeholder="Est. 25m"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="sm:col-span-2 bg-slate-950/80 border-white/10 text-white text-xs"
          />

          <Button type="submit" size="sm" className="sm:col-span-1 gradient-button text-xs rounded-lg">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </form>

      {/* Task Progress Tracker */}
      <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Completion Progress</span>
          <span className="font-mono text-cyan-400 font-semibold">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full"
          />
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        <AnimatePresence>
          {tasks.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 group ${
                task.done
                  ? 'bg-slate-900/40 border-white/5 opacity-70'
                  : 'bg-slate-900/80 border-white/10 hover:border-purple-500/30'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all ${
                    task.done
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'border-slate-600 hover:border-purple-400 bg-slate-950/60'
                  }`}
                >
                  {task.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>

                <div className="min-w-0 flex-1">
                  <div
                    className={`text-xs sm:text-sm font-medium ${
                      task.done ? 'line-through text-slate-400' : 'text-slate-200'
                    }`}
                  >
                    {task.task}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    task.priority === 'High'
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                      : task.priority === 'Medium'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  }`}
                >
                  {task.priority}
                </span>

                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-white/5 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" /> {task.time}
                </span>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
