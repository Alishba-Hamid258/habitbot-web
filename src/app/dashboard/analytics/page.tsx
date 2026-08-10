'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { BarChart2, Flame, Shield, Clock, Award, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  getActiveUser,
  getUserScopedData,
  computeUserStats,
  DailyHabitLogRecord,
} from '@/lib/auth-storage';
import { calculateLevel } from '@/lib/xp';

interface WeeklyPoint {
  day: string;
  dateStr: string;
  habits: number;
  focusMins: number;
}

export default function AnalyticsPage() {
  const [reportLoading, setReportLoading] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [userAnalytics, setUserAnalytics] = useState({
    streak: 0,
    habitsCompleted: 0,
    disciplineRate: 0,
    focusMins: 0,
    focusHours: 0,
    totalXP: 0,
  });
  const [weeklyChartData, setWeeklyChartData] = useState<WeeklyPoint[]>([]);
  const [heatmapDays, setHeatmapDays] = useState<{ date: string; count: number }[]>([]);

  const loadUserAnalytics = () => {
    const active = getActiveUser();
    if (active) {
      const stats = computeUserStats(active.id);
      const habits = getUserScopedData<any[]>(active.id, 'habits', []);
      const completedHabits = habits.filter((h) => h.completed).length;

      const focus = getUserScopedData<any[]>(active.id, 'focus_sessions', []);
      let focusMins = 0;
      focus.forEach((f) => {
        focusMins += Number(f.duration_mins) || 0;
      });

      const history = getUserScopedData<DailyHabitLogRecord[]>(active.id, 'daily_habit_history', []);
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // 1. Calculate Real Last 7 Days Data
      const daysLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const last7: WeeklyPoint[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        const dayLabel = daysLabels[d.getDay()];

        // Habits count for this day
        let hCount = 0;
        if (dStr === todayStr) {
          hCount = completedHabits;
        } else {
          const log = history.find((h) => h.date === dStr);
          hCount = log ? log.completedCount : 0;
        }

        // Focus minutes for this day
        let fMins = 0;
        focus
          .filter((f) => f.date === dStr)
          .forEach((f) => {
            fMins += Number(f.duration_mins) || 0;
          });

        last7.push({
          day: dayLabel,
          dateStr: dStr,
          habits: hCount,
          focusMins: fMins,
        });
      }
      setWeeklyChartData(last7);

      // 2. Calculate Real 365-Day Heatmap
      const heatmap: { date: string; count: number }[] = [];
      const totalCells = 52 * 7; // 364 days

      for (let i = totalCells - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dStr = d.toISOString().split('T')[0];

        let count = 0;
        if (dStr === todayStr) {
          count = completedHabits;
        } else {
          const log = history.find((h) => h.date === dStr);
          count = log ? log.completedCount : 0;
        }

        heatmap.push({ date: dStr, count });
      }
      setHeatmapDays(heatmap);

      setUserAnalytics({
        streak: stats.streak,
        habitsCompleted: completedHabits,
        disciplineRate: stats.disciplineRate,
        focusMins,
        focusHours: Math.round((focusMins / 60) * 10) / 10,
        totalXP: stats.totalXP,
      });
    }
  };

  useEffect(() => {
    loadUserAnalytics();
    window.addEventListener('habitbot_data_updated', loadUserAnalytics);
    return () => window.removeEventListener('habitbot_data_updated', loadUserAnalytics);
  }, []);

  const xpInfo = calculateLevel(userAnalytics.totalXP);

  const generateReport = () => {
    setReportLoading(true);
    setTimeout(() => {
      setReportLoading(false);
      setAiReport(
        `### 🧠 AI Weekly Mastery Audit\n\n` +
        `**Account Level: ${xpInfo.name} (${userAnalytics.totalXP} Total XP)**\n\n` +
        `1. **Habit Momentum**: You have completed **${userAnalytics.habitsCompleted} core habits** with an active **${userAnalytics.disciplineRate}% discipline rate**.\n` +
        `2. **Deep Work Volume**: Total focus time logged: **${userAnalytics.focusHours} hours** (${userAnalytics.focusMins} mins).\n` +
        `3. **Current Streak**: **${userAnalytics.streak} active days**.\n` +
        `4. **Coaching Prescription**: Apply the *2-Minute Rule* to start small and stack new routines onto existing daily anchors!`
      );
      toast.success('AI Performance Audit generated! 📊');
    }, 1000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold gradient-text flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-purple-400" /> Performance Analytics
          </h1>
          <p className="text-xs text-slate-400">Live dynamic tracking of habit consistency, deep work volume, and behavioral milestones</p>
        </div>

        <Button
          size="sm"
          onClick={generateReport}
          disabled={reportLoading}
          className="gradient-button text-xs gap-1.5 rounded-lg shadow-md shadow-purple-500/20"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{reportLoading ? 'Analyzing...' : 'Generate AI Weekly Audit'}</span>
        </Button>
      </div>

      {/* AI Report Card */}
      {aiReport && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-gradient-to-r from-purple-950/40 via-slate-900/80 to-cyan-950/40 rounded-xl border border-purple-500/30 text-xs leading-relaxed space-y-2 shadow-lg"
        >
          <div className="flex items-center gap-2 text-purple-300 font-bold">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>AI Executive Coaching Audit</span>
          </div>
          <div className="text-slate-300 whitespace-pre-line">{aiReport}</div>
        </motion.div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Active Streak</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{userAnalytics.streak} Days</div>
          <div className="text-[10px] text-emerald-400 font-medium">~ Live tracking</div>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Habits Checked</span>
            <Shield className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{userAnalytics.habitsCompleted} Completed</div>
          <div className="text-[10px] text-purple-300 font-medium">{userAnalytics.disciplineRate}% discipline rate</div>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Deep Work</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{userAnalytics.focusHours} Hours</div>
          <div className="text-[10px] text-cyan-300 font-medium">{userAnalytics.focusMins} total minutes</div>
        </div>

        <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Mastery Level</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">Level {xpInfo.level}</div>
          <div className="text-[10px] text-amber-300 font-medium">{xpInfo.name}</div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Habit Completion Chart (Real Last 7 Days) */}
        <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
          <div className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Daily Habits Logged (Last 7 Days)</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="habits" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Focus Minutes Chart (Real Last 7 Days) */}
        <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
          <div className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Deep Work Minutes</span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
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
          {heatmapDays.map((d, i) => {
            const intensity = Math.min(4, d.count);
            const bgClass =
              intensity >= 4
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
                title={`${d.date}: ${d.count > 0 ? `${d.count} habits completed` : 'No habits logged'}`}
                className={`w-2.5 h-2.5 rounded-sm ${bgClass} transition-colors hover:scale-125 cursor-pointer`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
