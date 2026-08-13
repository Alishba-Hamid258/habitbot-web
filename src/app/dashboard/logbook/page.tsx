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

type TimeframeOption = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

export default function LogbookPage() {
  const [wentWell, setWentWell] = useState('');
  const [friction, setFriction] = useState('');
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [exporting, setExporting] = useState(false);
  const [userId, setUserId] = useState<number>(1);

  // Timeframe and Scale Filters (Default: Today's Daily Progress)
  const [timeframe, setTimeframe] = useState<TimeframeOption>('today');
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

  // Helper to determine if a date or timestamp is within selected timeframe
  const isDateInTimeframe = (dateStr?: string) => {
    if (!dateStr || timeframe === 'all') return true;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // e.g. "2026-08-11"
    const todayMonthDay = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // e.g. "Aug 11"

    if (timeframe === 'today') {
      if (dateStr.startsWith(todayStr)) return true;
      if (dateStr.includes(todayMonthDay)) return true;
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0] === todayStr || parsed.toDateString() === now.toDateString();
      }
      return false;
    }

    const date = new Date(dateStr);
    const isValidDate = !isNaN(date.getTime());

    if (timeframe === 'year') {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return isValidDate ? date >= yearStart : true;
    }

    if (timeframe === 'month') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return isValidDate ? date >= thirtyDaysAgo : true;
    }

    if (timeframe === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return isValidDate ? date >= sevenDaysAgo : true;
    }

    if (timeframe === 'custom') {
      if (customStart && isValidDate && date < new Date(customStart)) return false;
      if (customEnd && isValidDate && date > new Date(customEnd + 'T23:59:59')) return false;
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

      // 5. Sheet: Chat History & Saved Archives (Syncs active chat + vault sessions)
      if (selectedSheets.chat) {
        const userArchives = getUserScopedData<any[]>(userId, 'chat_archives', []);
        const activeChatMsgs = getUserScopedData<any[]>(userId, 'active_chat_messages', []);

        const allSessions = [...userArchives];
        // If active chat has user messages and isn't already duplicated in archives
        if (activeChatMsgs && activeChatMsgs.length > 1) {
          const firstUser = activeChatMsgs.find((m) => m.role === 'user')?.content || 'Current Active Session';
          const activeTitle = firstUser.slice(0, 38) + (firstUser.length > 38 ? '...' : '');
          if (!allSessions.some((s) => s.title === activeTitle)) {
            allSessions.unshift({
              id: 'active_current',
              title: `(Active) ${activeTitle}`,
              timestamp: new Date().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
              messages: activeChatMsgs,
            });
          }
        }

        const filteredArchives = allSessions.filter((s) => isDateInTimeframe(s.timestamp));
        const chatData: any[] = [];

        filteredArchives.forEach((s: any) => {
          s.messages?.forEach((m: any) => {
            if (m.content) {
              chatData.push({
                'Date / Time': s.timestamp || new Date().toISOString().split('T')[0],
                'Session Title': s.title || 'Habit Coaching',
                Speaker: m.role === 'assistant' ? 'HabitBot AI Coach 🤖' : 'User 👤',
                'Message Content': m.content,
              });
            }
          });
        });

        const wsChat = XLSX.utils.json_to_sheet(
          chatData.length > 0
            ? chatData
            : [
                {
                  'Date / Time': new Date().toISOString().split('T')[0],
                  'Session Title': 'No conversations recorded in timeframe',
                  Speaker: '',
                  'Message Content': '',
                },
              ]
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
        timeframe === 'today'
          ? 'Today_Daily'
          : timeframe === 'all'
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
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" /> Logbook & Data Export
        </h1>
        <p className="text-xs text-muted-foreground">Evening reflections, daily wins, and full Excel spreadsheet backups</p>
      </div>

      {/* Exporter Panel */}
      <div className="p-4 bg-card rounded-xl border border-border space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Data Export (.xlsx)</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Export habits, focus sessions, tasks, transcripts, and reflections into organized spreadsheets.
            </p>
          </div>

          <Button
            onClick={handleExportLifeAudit}
            disabled={exporting || selectedCount === 0}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium px-4 h-8 rounded-md shadow-none flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? 'Exporting...' : `Export ${selectedCount} Sheet${selectedCount > 1 ? 's' : ''}`}</span>
          </Button>
        </div>

        {/* Timeframe Scope Selector */}
        <div className="pt-3 border-t border-border/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground font-medium flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-primary" />
              <span>Timeframe:</span>
            </span>
            <span className="text-[10px] text-primary font-mono font-medium">
              {timeframe === 'today'
                ? "Today"
                : timeframe === 'all'
                ? 'All-Time'
                : `${timeframe.toUpperCase()}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: "Today (Default)" },
              { id: 'week', label: 'Last 7 Days' },
              { id: 'month', label: 'Last 30 Days' },
              { id: 'year', label: 'This Year' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom Range' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTimeframe(opt.id as TimeframeOption)}
                className={`py-1 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer border ${
                  timeframe === opt.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {timeframe === 'custom' && (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>From:</span>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-8 text-xs bg-background border-border text-foreground w-36 rounded-md px-2.5"
                />
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>To:</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-8 text-xs bg-background border-border text-foreground w-36 rounded-md px-2.5"
                />
              </div>
            </div>
          )}
        </div>

        {/* Sheet Selection Toggles */}
        <div className="pt-3 border-t border-border/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground font-medium flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>Select Sheets:</span>
            </span>
            <div className="flex gap-2 text-xs">
              <button onClick={() => setAllSheets(true)} className="text-[11px] text-primary hover:underline cursor-pointer font-medium">
                Select All
              </button>
              <span className="text-border">|</span>
              <button onClick={() => setAllSheets(false)} className="text-[11px] text-muted-foreground hover:underline cursor-pointer">
                Deselect All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { key: 'reflections', label: 'Evening Reflections', icon: BookOpen, color: 'text-primary' },
              { key: 'habits', label: 'Habit Matrix', icon: CheckCircle2, color: 'text-emerald-600' },
              { key: 'focus', label: 'Focus Sessions', icon: Clock, color: 'text-amber-500' },
              { key: 'tasks', label: 'Tasks Master', icon: Database, color: 'text-primary' },
              { key: 'chat', label: 'Chat Vault', icon: MessageSquare, color: 'text-purple-500' },
              { key: 'media', label: 'Soundtracks', icon: Video, color: 'text-pink-500' },
            ].map(({ key, label, icon: Icon, color }) => {
              const active = selectedSheets[key as keyof typeof selectedSheets];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSheet(key as keyof typeof selectedSheets)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-colors text-left cursor-pointer ${
                    active
                      ? 'bg-primary/10 border-primary/40 text-primary'
                      : 'bg-muted/40 border-border/80 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                      active ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/50 bg-background'
                    }`}
                  >
                    {active && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
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
      <form onSubmit={handleSaveReflection} className="p-4 bg-card rounded-xl border border-border space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Daily Reflection (+15 XP)</span>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
            <Calendar className="w-3.5 h-3.5 text-primary" /> {new Date().toISOString().split('T')[0]}
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">1. What went well today?</label>
            <textarea
              rows={2}
              placeholder="e.g. Completed 2 focus sprints, hit workout habit..."
              value={wentWell}
              onChange={(e) => setWentWell(e.target.value)}
              className="w-full bg-background border border-border rounded-lg p-2.5 text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">2. Where did you encounter friction or resistance?</label>
            <textarea
              rows={2}
              placeholder="e.g. Distracted during afternoon session..."
              value={friction}
              onChange={(e) => setFriction(e.target.value)}
              className="w-full bg-background border border-border rounded-lg p-2.5 text-foreground placeholder:text-muted-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4 h-8 rounded-md font-medium cursor-pointer">
            Save Reflection
          </Button>
        </div>
      </form>

      {/* Historical Reflections List */}
      <div className="space-y-2.5">
        <div className="text-xs font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          <span>Past Reflections ({reflections.length})</span>
        </div>

        {reflections.length === 0 ? (
          <div className="p-8 text-center bg-card rounded-xl border border-border space-y-2">
            <BookOpen className="w-8 h-8 text-muted-foreground mx-auto" />
            <div className="text-xs text-muted-foreground">No reflections logged yet. Submit your first review above!</div>
          </div>
        ) : (
          <div className="space-y-2">
            {reflections.map((r) => (
              <motion.div
                key={r.id || r.date}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-card rounded-xl border border-border space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-primary font-medium">{r.date}</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded-md font-semibold">
                    +15 XP
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <div>
                    <span className="text-emerald-600 font-medium">Wins: </span>
                    <span className="text-foreground">{r.wentWell}</span>
                  </div>
                  <div>
                    <span className="text-amber-600 font-medium">Friction: </span>
                    <span className="text-muted-foreground">{r.friction}</span>
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
