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
    <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-purple-300">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>{xpInfo.name}</span>
        </div>
        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
          Lv. {xpInfo.level}
        </span>
      </div>

      {/* Progress Track */}
      <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${xpInfo.progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 rounded-full"
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
          {xpInfo.totalXP} Total XP
        </span>
        <span>
          {xpInfo.currentXP} / {xpInfo.nextThreshold} XP ({xpInfo.progress}%)
        </span>
      </div>
    </div>
  );
}
