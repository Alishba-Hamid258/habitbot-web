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
    <div className="p-3.5 bg-white dark:bg-[#1e1e1e] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] space-y-2.5 transition-colors">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-[#202124] dark:text-[#e8eaed]">
          <Trophy className="w-3.5 h-3.5 text-[#f9ab00]" />
          <span>{xpInfo.name}</span>
        </div>
        <span className="text-[11px] font-mono text-[#1a73e8] dark:text-[#8ab4f8] bg-[#e8f0fe] dark:bg-[#394457] px-2 py-0.5 rounded-full font-semibold">
          Lv. {xpInfo.level}
        </span>
      </div>

      {/* Progress Track */}
      <div className="relative w-full h-1.5 bg-[#e8eaed] dark:bg-[#2d2e30] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${xpInfo.progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full bg-[#1a73e8] dark:bg-[#8ab4f8] rounded-full"
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-[#5f6368] dark:text-[#9aa0a6] font-mono">
        <span className="flex items-center gap-1 font-medium">
          <Zap className="w-3 h-3 text-[#f9ab00] fill-[#f9ab00]" />
          {xpInfo.totalXP} Total XP
        </span>
        <span>
          {xpInfo.currentXP} / {xpInfo.nextThreshold} XP ({xpInfo.progress}%)
        </span>
      </div>
    </div>
  );
}
