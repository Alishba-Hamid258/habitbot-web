'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Sparkles,
  Calendar,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Shield,
  Clock,
  CheckSquare,
  MessageSquare,
  Video,
  Check,
  Filter,
  Layers,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import {
  getActiveUser,
  getUserScopedData,
  setUserScopedData,
  addXP,
  getMasterTasks,
  MasterTaskRecord,
} from '@/lib/auth-storage';

interface ReflectionEntry {
  id: string;
  date: string;
  wentWell: string;
  friction: string;
}

type TimeframeOption = 'all' | 'year' | 'month' | 'week' | 'custom';

export default function LogbookPage() {
  const [wentWell, setWentWell] = useState('');
  const [friction, setFriction] = useState('');
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [exporting, setExporting] = useState(false);
  const [userId, setUserId] = useState<number>(1);

  // Timeframe and Scale Filters
  const [timeframe, setTimeframe] = useState<TimeframeOption>('all');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Customizable Sheet Selection states (Default: All Checked)
  const [selectedSheets, setSelectedSheets] = useState({
    reflections: true,
    habits: true,
    focus: true,
    tasks: true,
    chat: true,
    media: true,
  });

  // Load user-scoped reflections
  useEffect(() => {
    const active = getActiveUser();
    if (active) {
      setUserId(active.id);
      const userReflections = getUserScopedData<ReflectionEntry[]>(active.id, 'reflections', []);
      setReflections(userReflections);
    }
  }, []);

  const toggleSheet = (key: keyof typeof selectedSheets) => {
    setSelectedSheets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllSheets = (val: boolean) => {
    setSelectedSheets({
      reflections: val,
      habits: val,
      focus: val,
      tasks: val,
      chat: val,
      media: val,
    });
  };

  const selectedCount = Object.values(selectedSheets).filter(Boolean).length;

  const handleSaveReflection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wentWell.trim() && !friction.trim()) {
      toast.error('Please fill in at least one reflection field.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newEntry: ReflectionEntry = {
      id: Date.now().toString(),
      date: todayStr,
      wentWell: wentWell.trim() || 'Nothing noted',
      friction: friction.trim() || 'No major friction noted',
    };

    const updated = [newEntry, ...reflections.filter((r) => r.date !== todayStr)];
    setReflections(updated);
    setUserScopedData(userId, 'reflections', updated);
    addXP(userId, 15);

    setWentWell('');
    setFriction('');
    toast.success('Evening reflection saved! (+15 XP)', { icon: '📓' });
  };

  // Helper to determine if a date is within selected timeframe
  const isDateInTimeframe = (dateStr?: string) => {
    if (!dateStr || timeframe === 'all') return true;
    const date = new Date(dateStr);
    const now = new Date();

    if (timeframe === 'year') {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return date >= yearStart;
    }

    if (timeframe === 'month') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return date >= thirtyDaysAgo;
    }

    if (timeframe === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return date >= sevenDaysAgo;
    }

    if (timeframe === 'custom') {
      if (customStart && date < new Date(customStart)) return false;
      if (customEnd && date > new Date(customEnd + 'T23:59:59')) return false;
      return true;
    }

    return true;
  };

  const handleExportLifeAudit = () => {
    if (selectedCount === 0) {
      toast.error('Please select at least 1 sheet to include in your export.');
      return;
    }

    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // 1. Sheet: Evening Reflections
      if (selectedSheets.reflections) {
        const filteredRef = reflections.filter((r) => isDateInTimeframe(r.date));
        const refData = filteredRef.map((r) => ({
          Date: r.date,
          'What Went Well': r.wentWell,
          'Points of Friction': r.friction,
        }));
        const wsReflections = XLSX.utils.json_to_sheet(
          refData.length > 0 ? refData : [{ Date: 'No records in timeframe', 'What Went Well': '', 'Points of Friction': '' }]
        );
        XLSX.utils.book_append_sheet(wb, wsReflections, 'Evening Reflections');
      }

      // 2. Sheet: Habits Matrix History
      if (selectedSheets.habits) {
        const userHabits = getUserScopedData<any[]>(userId, 'habits', []);
        const habitRows =
          userHabits.length > 0
            ? userHabits.map((h) => ({
                Habit: h.name,
                Status: h.completed ? 'Completed (Checked)' : 'Pending',
                Frequency: 'Daily',
                ExportDate: new Date().toISOString().split('T')[0],
              }))
            : [{ Habit: 'No habits configured', Status: '', Frequency: '', ExportDate: '' }];
        const wsHabits = XLSX.utils.json_to_sheet(habitRows);
        XLSX.utils.book_append_sheet(wb, wsHabits, 'Habits History');
      }

      // 3. Sheet: Deep Work & Focus Sessions
      if (selectedSheets.focus) {
        const userFocus = getUserScopedData<any[]>(userId, 'focus_sessions', []);
        const filteredFocus = userFocus.filter((f) => isDateInTimeframe(f.date));
        const focusRows =
          filteredFocus.length > 0
            ? filteredFocus.map((f) => ({
                Date: f.date,
                Activity: f.mode,
                'Duration (Mins)': f.duration_mins,
                XPEarned: Number(f.duration_mins) || 0,
              }))
            : [{ Date: 'No focus sessions in timeframe', Activity: '', 'Duration (Mins)': 0, XPEarned: 0 }];
        const wsFocus = XLSX.utils.json_to_sheet(focusRows);
        XLSX.utils.book_append_sheet(wb, wsFocus, 'Deep Work Sessions');
      }

      // 4. Sheet: Tasks History & Master Database (Preserves all created, completed, or deleted tasks)
      if (selectedSheets.tasks) {
        const masterTasks = getMasterTasks(userId);
        const filteredMaster = masterTasks.filter(
          (t) => isDateInTimeframe(t.createdAt) || isDateInTimeframe(t.completedAt)
        );

        const taskRows =
          filteredMaster.length > 0
            ? filteredMaster.map((t) => ({
                'Created Date': t.createdAt,
                Task: t.task,
                Priority: t.priority,
                'Time Allocated': t.time,
                'Lifecycle Status': t.status,
                'Completed Date': t.completedAt || 'N/A',
                'XP Earned': t.status === 'Completed' ? '+5 XP' : '0 XP',
              }))
            : [
                {
                  'Created Date': new Date().toISOString().split('T')[0],
                  Task: 'No tasks in database',
                  Priority: '',
                  'Time Allocated': '',
                  'Lifecycle Status': '',
                  'Completed Date': '',
                  'XP Earned': '',
                },
              ];

        const wsTasks = XLSX.utils.json_to_sheet(taskRows);
        XLSX.utils.book_append_sheet(wb, wsTasks, 'Tasks Master Database');
      }

      // 5. Sheet: Chat History & Saved Archives
      if (selectedSheets.chat) {
        const userArchives = getUserScopedData<any[]>(userId, 'chat_archives', []);
        const filteredArchives = userArchives.filter((s) => isDateInTimeframe(s.timestamp));
        const chatData: any[] = [];
        filteredArchives.forEach((s: any) => {
          s.messages?.forEach((m: any) => {
            chatData.push({
              Timestamp: s.timestamp,
              SessionTitle: s.title,
              Speaker: m.role === 'assistant' ? 'HabitBot Coach' : 'User',
              Message: m.content,
            });
          });
        });
        const wsChat = XLSX.utils.json_to_sheet(
          chatData.length > 0
            ? chatData
            : [{ Timestamp: '', SessionTitle: 'No archived chats in timeframe', Speaker: '', Message: '' }]
        );
        XLSX.utils.book_append_sheet(wb, wsChat, 'Chat History & Archives');
      }

      // 6. Sheet: Media & Custom Focus Soundtracks
      if (selectedSheets.media) {
        const userMedia = getUserScopedData<any[]>(userId, 'media_history', []);
        const activeUrl = getUserScopedData<string>(userId, 'active_video', 'https://www.youtube.com/watch?v=jfKfPfyJRdk');
        const filteredMedia = userMedia.filter((m) => isDateInTimeframe(m.Date));

        const mediaRows = [...filteredMedia];
        if (!mediaRows.some((m) => m.MediaUrl === activeUrl)) {
          mediaRows.unshift({
            Date: new Date().toISOString().split('T')[0],
            Title: 'Current Active Focus Track',
            MediaUrl: activeUrl,
          });
        }

        const wsMedia = XLSX.utils.json_to_sheet(mediaRows);
        XLSX.utils.book_append_sheet(wb, wsMedia, 'Focus Media & Soundtracks');
      }

      // Format filename with timeframe indicator
      const timeframeTag =
        timeframe === 'all'
          ? 'Lifetime'
          : timeframe === 'year'
          ? 'Year_2026'
          : timeframe === 'month'
          ? 'Last_30_Days'
          : timeframe === 'week'
          ? 'Last_7_Days'
          : 'Custom_Range';

      const filename = `HabitBot_Life_Audit_${timeframeTag}_${new Date().toISOString().split('T')[0]}.xlsx`;

      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${selectedCount} sheet${selectedCount > 1 ? 's' : ''} (${timeframeTag}) to Excel! 📊`);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-400" /> Logbook, Reflections & Custom Export
        </h1>
        <p className="text-xs text-slate-400">Daily evening reflections, behavioral insights, and tailored Excel data backups</p>
      </div>

      {/* Customizable Life Audit Exporter Banner Card */}
      <div className="p-5 bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-cyan-950/30 rounded-xl border border-purple-500/20 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Full Life Audit & Behavioral Exporter</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Exports your habits, deep work focus hours, tasks master database, chat transcripts, and reflections into structured multi-sheet Excel files.
            </p>
          </div>

          <Button
            onClick={handleExportLifeAudit}
            disabled={exporting || selectedCount === 0}
            className="gradient-button text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-purple-500/20 flex items-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{exporting ? 'Compiling Excel...' : `Export ${selectedCount} Sheet${selectedCount > 1 ? 's' : ''}`}</span>
          </Button>
        </div>

        {/* Timeframe Scope Selector */}
        <div className="pt-2 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              <span>Timeframe & Scale Scope:</span>
            </span>
            <span className="text-[10px] text-purple-300 font-mono">
              {timeframe === 'all' ? 'All-Time Lifetime Records' : `Filtered: ${timeframe.toUpperCase()}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: '🌟 All Time (Lifetime)' },
              { id: 'year', label: '📅 This Year (2026)' },
              { id: 'month', label: '🗓️ Last 30 Days' },
              { id: 'week', label: '⚡ Last 7 Days' },
              { id: 'custom', label: '⚙️ Custom Date Range' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTimeframe(opt.id as TimeframeOption)}
                className={`py-1 px-2.5 rounded-lg text-[11px] font-medium transition-colors border ${
                  timeframe === opt.id
                    ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 shadow-sm'
                    : 'bg-slate-950/40 text-slate-400 border-white/5 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {timeframe === 'custom' && (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <span>From:</span>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-7 text-xs bg-slate-950 border-white/10 text-white w-36"
                />
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <span>To:</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-7 text-xs bg-slate-950 border-white/10 text-white w-36"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sheet Selection Toggles */}
        <div className="pt-2 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>Select Sheets to Include:</span>
            </span>
            <div className="flex gap-2">
              <button onClick={() => setAllSheets(true)} className="text-[11px] text-cyan-400 hover:underline">
                Select All
              </button>
              <span className="text-slate-600">|</span>
              <button onClick={() => setAllSheets(false)} className="text-[11px] text-slate-400 hover:underline">
                Deselect All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { key: 'reflections', label: 'Evening Reflections', icon: BookOpen, color: 'text-purple-400' },
              { key: 'habits', label: 'Habit Matrix Logs', icon: CheckCircle2, color: 'text-cyan-400' },
              { key: 'focus', label: 'Deep Work Sessions', icon: Clock, color: 'text-amber-400' },
              { key: 'tasks', label: 'Tasks Master Database', icon: Database, color: 'text-emerald-400' },
              { key: 'chat', label: 'AI Chat Vaults', icon: MessageSquare, color: 'text-indigo-400' },
              { key: 'media', label: 'Focus Soundtracks', icon: Video, color: 'text-pink-400' },
            ].map(({ key, label, icon: Icon, color }) => {
              const active = selectedSheets[key as keyof typeof selectedSheets];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSheet(key as keyof typeof selectedSheets)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-colors text-left ${
                    active
                      ? 'bg-purple-950/40 border-purple-500/40 text-slate-100 shadow-sm'
                      : 'bg-slate-950/40 border-white/5 text-slate-500 hover:text-slate-400'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                      active ? 'bg-purple-600 border-purple-500 text-white' : 'border-white/20'
                    }`}
                  >
                    {active && <Check className="w-3 h-3" />}
                  </div>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  <span className="truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Evening Reflection Card */}
      <form onSubmit={handleSaveReflection} className="p-5 bg-slate-900/60 rounded-xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Daily Behavioral Reflection (+15 XP)</span>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Today: {new Date().toISOString().split('T')[0]}
          </span>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">1. What went exceptionally well today?</label>
            <textarea
              rows={2}
              placeholder="e.g. Completed 2 deep work sprints, hit workout habit, resisted sugar cravings..."
              value={wentWell}
              onChange={(e) => setWentWell(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/10 rounded-lg p-2.5 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">2. Where did you encounter friction or resistance?</label>
            <textarea
              rows={2}
              placeholder="e.g. Checked phone at 3 PM, delayed starting task 2 by 20 minutes..."
              value={friction}
              onChange={(e) => setFriction(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/10 rounded-lg p-2.5 text-white placeholder:text-slate-500 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="sm" className="gradient-button text-xs px-5 rounded-lg">
            Save Evening Reflection
          </Button>
        </div>
      </form>

      {/* Historical Reflections List */}
      <div className="space-y-3">
        <div className="text-sm font-semibold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span>Past Reflection Entries ({reflections.length})</span>
        </div>

        {reflections.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/30 rounded-xl border border-white/5 space-y-2">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-xs text-slate-400">No reflections logged yet. Submit your first daily review above!</div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {reflections.map((r) => (
              <motion.div
                key={r.id || r.date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-purple-300 font-semibold">{r.date}</span>
                  <span className="text-[10px] bg-purple-950/60 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded">
                    +15 XP Earned
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-emerald-400 font-medium">✨ Wins: </span>
                    <span className="text-slate-200">{r.wentWell}</span>
                  </div>
                  <div>
                    <span className="text-amber-400 font-medium">⚠️ Friction: </span>
                    <span className="text-slate-300">{r.friction}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
