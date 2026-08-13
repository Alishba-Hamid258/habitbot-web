'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, HelpCircle } from 'lucide-react';
import { calculateLevel } from '@/lib/xp';
import { ScoringGuideModal } from '@/components/modals/scoring-guide-modal';

interface XPBarProps {
  totalXP?: number;
}

export function XPBar({ totalXP = 120 }: XPBarProps) {
  const xpInfo = calculateLevel(totalXP);
  const [showGuide, setShowGuide] = useState(false);

  return (
    <>
      <div className="p-3.5 bg-card rounded-xl border border-border space-y-2.5 transition-colors">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>{xpInfo.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowGuide(true)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5 rounded"
              title="Learn how XP and Levels work"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md font-semibold">
              Lv. {xpInfo.level}
            </span>
          </div>
        </div>

        {/* Progress Track */}
        <div className="relative w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpInfo.progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-primary rounded-full"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1 font-medium">
            <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
            {xpInfo.totalXP} XP
          </span>
          <span>
            {xpInfo.currentXP} / {xpInfo.nextThreshold} XP ({xpInfo.progress}%)
          </span>
        </div>
      </div>

      {showGuide && (
        <ScoringGuideModal
          open={showGuide}
          onOpenChange={setShowGuide}
          defaultTab="xp"
        />
      )}
    </>
  );
}
