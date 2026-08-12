'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap } from 'lucide-react';
import { calculateLevel } from '@/lib/xp';

interface XPBarProps {
  totalXP?: number;
}

export function XPBar({ totalXP = 120 }: XPBarProps) {
  const xpInfo = calculateLevel(totalXP);

  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-2 transition-colors">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-purple-300">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>{xpInfo.name}</span>
        </div>
        <span className="text-[11px] font-mono text-indigo-600 dark:text-cyan-400 bg-indigo-50 dark:bg-cyan-500/10 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-cyan-500/20 font-semibold">
          Lv. {xpInfo.level}
        </span>
      </div>

      {/* Progress Track */}
      <div className="relative w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${xpInfo.progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full bg-slate-900 dark:bg-gradient-to-r dark:from-purple-500 dark:via-indigo-500 dark:to-cyan-400 rounded-full"
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
        <span className="flex items-center gap-1 font-medium">
          <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
          {xpInfo.totalXP} Total XP
        </span>
        <span>
          {xpInfo.currentXP} / {xpInfo.nextThreshold} XP ({xpInfo.progress}%)
        </span>
      </div>
    </div>
  );
}
