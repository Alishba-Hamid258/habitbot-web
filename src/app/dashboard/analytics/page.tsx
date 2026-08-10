'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BarChart2, Flame, Shield, Clock, Award, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const WEEKLY_DATA = [
  { day: 'Mon', habits: 4, focusMins: 45 },
  { day: 'Tue', habits: 5, focusMins: 60 },
  { day: 'Wed', habits: 3, focusMins: 25 },
  { day: 'Thu', habits: 6, focusMins: 75 },
  { day: 'Fri', habits: 4, focusMins: 50 },
  { day: 'Sat', habits: 5, focusMins: 90 },
  { day: 'Sun', habits: 6, focusMins: 40 },
];

export default function AnalyticsPage() {
  const [reportLoading, setReportLoading] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  const generateReport = () => {
    setReportLoading(true);
    setTimeout(() => {
      setReportLoading(false);
      setAiReport(
        "### 🧠 AI Weekly Mastery Audit\n\n" +
        "**Overall Grade: A- (High Consistency)**\n\n" +
        "1. **Peak Performance**: Your highest focus session was **Saturday (90 mins)**.\n" +
        "2. **Habit Momentum**: You completed **33 core habits** across the last 7 days with an **85% completion rate**.\n" +
        "3. **Friction Analysis**: Wednesday showed a slight dip in morning habits. Try implementing the *2-Minute Rule* on midweek mornings to keep friction near zero.\n" +
        "4. **Prescription**: Maintain your 3-day active streak to unlock the *⚔️ 7-Day Warrior* milestone badge!"
      );
      toast.success('AI Performance Audit generated! 📊');
    }, 1200);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-purple-400" /> Performance Analytics
          </h1>
          <p className="text-xs text-slate-400">Track habit consistency, deep work volume, and behavioral trends</p>
        </div>

        <Button
          size="sm"
          onClick={generateReport}
          disabled={reportLoading}
          className="gradient-button text-xs gap-1.5 rounded-lg shadow-md shadow-purple-500/20"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {reportLoading ? 'Analyzing...' : 'Generate AI Weekly Audit'}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Streak</span>
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">3 Days</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +1 day from yesterday
          </div>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Habits Checked</span>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">33 Completed</div>
          <div className="text-[11px] text-slate-400">85% consistency rate</div>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Deep Work</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">6.4 Hours</div>
          <div className="text-[11px] text-cyan-400">385 total minutes</div>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Mastery Tier</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">Tier 1</div>
          <div className="text-[11px] text-purple-300">🥉 Novice Starter</div>
        </div>
      </div>

      {/* AI Report Box */}
      {aiReport && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-900/60 rounded-xl border border-purple-500/30 text-xs text-slate-200 leading-relaxed shadow-lg space-y-2"
        >
          <div className="whitespace-pre-line">{aiReport}</div>
        </motion.div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Habit Completion Bar Chart */}
        <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
          <div className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Daily Habits Logged (Last 7 Days)</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WEEKLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="habits" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Focus Minutes Chart */}
        <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
          <div className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Deep Work Minutes</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WEEKLY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="focusMins" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 365-Day Consistency Heatmap Grid */}
      <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200">365-Day Habit Matrix Heatmap</span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span>Less</span>
            <div className="w-2.5 h-2.5 rounded-sm bg-slate-800" />
            <div className="w-2.5 h-2.5 rounded-sm bg-purple-900/50" />
            <div className="w-2.5 h-2.5 rounded-sm bg-purple-600" />
            <div className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
            <span>More</span>
          </div>
        </div>

        <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto py-2 custom-scrollbar">
          {Array.from({ length: 52 * 7 }).map((_, i) => {
            const intensity = (i * 13) % 5;
            const bgClass =
              intensity === 4
                ? 'bg-cyan-400 shadow-sm shadow-cyan-500/50'
                : intensity === 3
                ? 'bg-purple-600'
                : intensity === 2
                ? 'bg-purple-800/60'
                : intensity === 1
                ? 'bg-purple-950/40'
                : 'bg-slate-800/40';

            return (
              <div
                key={i}
                title={`Day ${i + 1}: ${intensity > 0 ? `${intensity * 2} habits completed` : 'No activity'}`}
                className={`w-2.5 h-2.5 rounded-sm ${bgClass} transition-colors hover:scale-125 cursor-pointer`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
