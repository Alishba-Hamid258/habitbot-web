'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Download, Sparkles, Check, Calendar, ArrowRight, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ReflectionEntry {
  id: string;
  date: string;
  wentWell: string;
  friction: string;
}

const DEFAULT_REFLECTIONS: ReflectionEntry[] = [
  {
    id: '1',
    date: '2026-08-09',
    wentWell: 'Completed 60 minutes of deep focus without checking social media once.',
    friction: 'Felt tired around 3 PM; need to optimize afternoon hydration.',
  },
  {
    id: '2',
    date: '2026-08-08',
    wentWell: 'Maintained morning walk routine and hit 100% habit matrix.',
    friction: 'Started work 20 minutes late due to unstructured morning transition.',
  },
];

export default function LogbookPage() {
  const [wentWell, setWentWell] = useState('');
  const [friction, setFriction] = useState('');
  const [reflections, setReflections] = useState<ReflectionEntry[]>(DEFAULT_REFLECTIONS);
  const [exporting, setExporting] = useState(false);

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('habitbot_reflections');
    if (saved) {
      try {
        setReflections(JSON.parse(saved));
      } catch {}
    }
  }, []);

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
    localStorage.setItem('habitbot_reflections', JSON.stringify(updated));

    setWentWell('');
    setFriction('');
    toast.success('Evening reflection saved! (+15 XP)', { icon: '📓' });
  };

  const handleExportLifeAudit = () => {
    setExporting(true);
    try {
      // 1. Sheet: Reflections
      const refData = reflections.map((r) => ({
        Date: r.date,
        'What Went Well': r.wentWell,
        'Points of Friction': r.friction,
      }));
      const wsReflections = XLSX.utils.json_to_sheet(refData);

      // 2. Sheet: Habits Matrix
      const wsHabits = XLSX.utils.json_to_sheet([
        { Date: '2026-08-09', Habit: '💧 Drink 2L Water', Status: 'Completed', Category: 'Health' },
        { Date: '2026-08-09', Habit: '🏃 20m Morning Walk', Status: 'Completed', Category: 'Fitness' },
        { Date: '2026-08-09', Habit: '📖 Read 10 Pages', Status: 'Completed', Category: 'Mindset' },
      ]);

      // 3. Sheet: Focus Sessions
      const wsFocus = XLSX.utils.json_to_sheet([
        { Date: '2026-08-09', Title: 'Deep Work Block 1', DurationMins: 45, Mode: 'Focus' },
        { Date: '2026-08-09', Title: 'System Refactoring', DurationMins: 30, Mode: 'Focus' },
      ]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsReflections, 'Evening Reflections');
      XLSX.utils.book_append_sheet(wb, wsHabits, 'Habits History');
      XLSX.utils.book_append_sheet(wb, wsFocus, 'Deep Work Sessions');

      XLSX.writeFile(wb, `HabitBot_Life_Audit_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Life Audit Excel workbook downloaded! 📊');
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" /> Logbook & Reflections
          </h1>
          <p className="text-xs text-slate-400">Daily evening reflections, behavioral insights, and data backups</p>
        </div>

        <Button
          size="sm"
          onClick={handleExportLifeAudit}
          disabled={exporting}
          className="gradient-button text-xs gap-1.5 rounded-lg shadow-md shadow-purple-500/20"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Export Life Audit (.xlsx)</span>
        </Button>
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
