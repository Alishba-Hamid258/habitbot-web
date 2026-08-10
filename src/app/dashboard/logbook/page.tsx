'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Sparkles, Calendar, FileSpreadsheet, Download, CheckCircle2, Shield, Clock, CheckSquare, MessageSquare, Video, Check, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { getActiveUser, getUserScopedData, setUserScopedData } from '@/lib/auth-storage';

interface ReflectionEntry {
  id: string;
  date: string;
  wentWell: string;
  friction: string;
}

const DEFAULT_REFLECTIONS: ReflectionEntry[] = [];

export default function LogbookPage() {
  const [wentWell, setWentWell] = useState('');
  const [friction, setFriction] = useState('');
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [exporting, setExporting] = useState(false);
  const [userId, setUserId] = useState<number>(1);

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
      const userReflections = getUserScopedData<ReflectionEntry[]>(active.id, 'reflections', DEFAULT_REFLECTIONS);
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

    setWentWell('');
    setFriction('');
    toast.success('Evening reflection saved! (+15 XP)', { icon: '📓' });
  };

  const handleExportLifeAudit = () => {
    if (selectedCount === 0) {
      toast.error('Please select at least 1 sheet to include in your export.');
      return;
    }

    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // 1. Sheet: Reflections
      if (selectedSheets.reflections) {
        const refData = reflections.map((r) => ({
          Date: r.date,
          'What Went Well': r.wentWell,
          'Points of Friction': r.friction,
        }));
        const wsReflections = XLSX.utils.json_to_sheet(
          refData.length > 0 ? refData : [{ Date: 'No records', 'What Went Well': '', 'Points of Friction': '' }]
        );
        XLSX.utils.book_append_sheet(wb, wsReflections, 'Evening Reflections');
      }

      // 2. Sheet: Habits Matrix History
      if (selectedSheets.habits) {
        const userHabits = getUserScopedData<any[]>(userId, 'habits', []);
        const habitRows = userHabits.length > 0
          ? userHabits.map((h) => ({
              Habit: h.name,
              Status: h.completed ? 'Completed (Checked)' : 'Pending',
              Date: new Date().toISOString().split('T')[0],
            }))
          : [{ Habit: 'No habits configured', Status: '', Date: '' }];
        const wsHabits = XLSX.utils.json_to_sheet(habitRows);
        XLSX.utils.book_append_sheet(wb, wsHabits, 'Habits History');
      }

      // 3. Sheet: Deep Work & Focus Sessions
      if (selectedSheets.focus) {
        const userFocus = getUserScopedData<any[]>(userId, 'focus_sessions', []);
        const focusRows = userFocus.length > 0
          ? userFocus.map((f) => ({ Date: f.date, Activity: f.mode, 'Duration (Mins)': f.duration_mins }))
          : [{ Date: 'No focus sessions', Activity: '', 'Duration (Mins)': 0 }];
        const wsFocus = XLSX.utils.json_to_sheet(focusRows);
        XLSX.utils.book_append_sheet(wb, wsFocus, 'Deep Work Sessions');
      }

      // 4. Sheet: Tasks History
      if (selectedSheets.tasks) {
        const userTasks = getUserScopedData<any[]>(userId, 'tasks', []);
        const taskRows = userTasks.length > 0
          ? userTasks.map((t) => ({
              Task: t.task,
              Priority: t.priority,
              EstTime: t.time,
              Status: t.done ? 'Completed' : 'Pending',
            }))
          : [{ Task: 'No tasks configured', Priority: '', EstTime: '', Status: '' }];
        const wsTasks = XLSX.utils.json_to_sheet(taskRows);
        XLSX.utils.book_append_sheet(wb, wsTasks, 'Tasks History');
      }

      // 5. Sheet: Chat History & Saved Archives
      if (selectedSheets.chat) {
        const userArchives = getUserScopedData<any[]>(userId, 'chat_archives', []);
        const chatData: any[] = [];
        userArchives.forEach((s: any) => {
          s.messages?.forEach((m: any) => {
            chatData.push({
              Timestamp: s.timestamp,
              Session: s.title,
              Speaker: m.role === 'assistant' ? 'HabitBot' : 'User',
              Message: m.content,
            });
          });
        });
        const wsChat = XLSX.utils.json_to_sheet(
          chatData.length > 0
            ? chatData
            : [{ Timestamp: '', Session: 'No archived chats', Speaker: '', Message: '' }]
        );
        XLSX.utils.book_append_sheet(wb, wsChat, 'Chat History & Archives');
      }

      // 6. Sheet: Media & Custom Focus Soundtracks
      if (selectedSheets.media) {
        const userMedia = getUserScopedData<any[]>(userId, 'media_history', []);
        const mediaRows = userMedia.length > 0
          ? userMedia
          : [
              {
                Date: new Date().toISOString().split('T')[0],
                MediaUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
                Title: 'Lofi Girl - Synthwave / Focus Beats',
              },
            ];
        const wsMedia = XLSX.utils.json_to_sheet(mediaRows);
        XLSX.utils.book_append_sheet(wb, wsMedia, 'Focus Media & Soundtracks');
      }

      // Trigger custom multi-sheet workbook download
      XLSX.writeFile(wb, `HabitBot_Life_Audit_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`Exported ${selectedCount} selected sheet${selectedCount > 1 ? 's' : ''} to Excel! 📊`);
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
              <span>Tailored Life Audit Excel Export (.xlsx)</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Select which sheets you want to include in your download. Untick any you do not need:
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleExportLifeAudit}
              disabled={exporting || selectedCount === 0}
              className={`gradient-button text-xs gap-1.5 px-4 py-2 rounded-xl shadow-lg shadow-purple-500/20 ${
                selectedCount === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Download className="w-4 h-4" />
              <span>{exporting ? 'Generating Excel...' : `Download ${selectedCount} Sheet${selectedCount > 1 ? 's' : ''} (.xlsx)`}</span>
            </Button>
          </div>
        </div>

        {/* Interactive Checkbox Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-white/10">
          <button
            onClick={() => toggleSheet('reflections')}
            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
              selectedSheets.reflections
                ? 'bg-purple-950/40 border-purple-500/40 text-purple-200 shadow-sm'
                : 'bg-slate-950/40 border-white/5 text-slate-400 opacity-60 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>1. Evening Reflections</span>
            </div>
            <div
              className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] font-bold ${
                selectedSheets.reflections
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'border-slate-600 bg-slate-900'
              }`}
            >
              {selectedSheets.reflections && '✓'}
            </div>
          </button>

          <button
            onClick={() => toggleSheet('habits')}
            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
              selectedSheets.habits
                ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-200 shadow-sm'
                : 'bg-slate-950/40 border-white/5 text-slate-400 opacity-60 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>2. Habits Log</span>
            </div>
            <div
              className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] font-bold ${
                selectedSheets.habits
                  ? 'bg-cyan-600 border-cyan-500 text-white'
                  : 'border-slate-600 bg-slate-900'
              }`}
            >
              {selectedSheets.habits && '✓'}
            </div>
          </button>

          <button
            onClick={() => toggleSheet('focus')}
            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
              selectedSheets.focus
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-200 shadow-sm'
                : 'bg-slate-950/40 border-white/5 text-slate-400 opacity-60 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>3. Focus Sessions</span>
            </div>
            <div
              className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] font-bold ${
                selectedSheets.focus
                  ? 'bg-amber-600 border-amber-500 text-white'
                  : 'border-slate-600 bg-slate-900'
              }`}
            >
              {selectedSheets.focus && '✓'}
            </div>
          </button>

          <button
            onClick={() => toggleSheet('tasks')}
            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
              selectedSheets.tasks
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200 shadow-sm'
                : 'bg-slate-950/40 border-white/5 text-slate-400 opacity-60 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>4. Tasks History</span>
            </div>
            <div
              className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] font-bold ${
                selectedSheets.tasks
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'border-slate-600 bg-slate-900'
              }`}
            >
              {selectedSheets.tasks && '✓'}
            </div>
          </button>

          <button
            onClick={() => toggleSheet('chat')}
            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
              selectedSheets.chat
                ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200 shadow-sm'
                : 'bg-slate-950/40 border-white/5 text-slate-400 opacity-60 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>5. Chat Logs</span>
            </div>
            <div
              className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] font-bold ${
                selectedSheets.chat
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'border-slate-600 bg-slate-900'
              }`}
            >
              {selectedSheets.chat && '✓'}
            </div>
          </button>

          <button
            onClick={() => toggleSheet('media')}
            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
              selectedSheets.media
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-200 shadow-sm'
                : 'bg-slate-950/40 border-white/5 text-slate-400 opacity-60 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-2">
              <Video className="w-3.5 h-3.5 text-rose-400" />
              <span>6. Media History</span>
            </div>
            <div
              className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] font-bold ${
                selectedSheets.media
                  ? 'bg-rose-600 border-rose-500 text-white'
                  : 'border-slate-600 bg-slate-900'
              }`}
            >
              {selectedSheets.media && '✓'}
            </div>
          </button>
        </div>

        {/* Select All / Deselect All Controls */}
        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="text-slate-400">{selectedCount} of 6 sheets selected</span>
          <div className="flex gap-3">
            <button onClick={() => setAllSheets(true)} className="text-cyan-400 hover:underline">
              Select All
            </button>
            <span className="text-slate-600">•</span>
            <button onClick={() => setAllSheets(false)} className="text-slate-400 hover:underline">
              Deselect All
            </button>
          </div>
        </div>
      </div>

      {/* Reflection Input Form */}
      <form onSubmit={handleSaveReflection} className="p-5 bg-slate-900/60 rounded-xl border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Evening Reflection ({new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})</span>
          </div>
          <span className="text-[10px] text-cyan-300 font-mono">+15 XP upon saving</span>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">1. What went exceptionally well today?</label>
          <textarea
            rows={2}
            placeholder="Key wins, positive habits completed, flow state moments..."
            value={wentWell}
            onChange={(e) => setWentWell(e.target.value)}
            className="w-full p-3 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">2. What was a point of friction or distraction?</label>
          <textarea
            rows={2}
            placeholder="Procrastination triggers, energy slumps, unexpected blockers..."
            value={friction}
            onChange={(e) => setFriction(e.target.value)}
            className="w-full p-3 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <Button type="submit" size="sm" className="gradient-button text-xs px-5 py-4 rounded-xl">
          Save Daily Reflection
        </Button>
      </form>

      {/* Reflection History Feed */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-300">📜 Past Reflection Entries</div>

        <div className="space-y-3">
          {reflections.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-2.5"
            >
              <div className="flex items-center justify-between text-xs pb-1 border-b border-white/5">
                <span className="font-mono text-purple-300 font-semibold flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  {r.date}
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Reflected
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="text-emerald-300 font-medium">✨ Wins & Progress:</div>
                <div className="text-slate-300 pl-2 leading-relaxed">{r.wentWell}</div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="text-rose-300 font-medium">⚡ Friction & Blockers:</div>
                <div className="text-slate-300 pl-2 leading-relaxed">{r.friction}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
