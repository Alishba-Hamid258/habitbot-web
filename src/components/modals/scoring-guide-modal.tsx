'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap, Flame, Target, Snowflake, Award, CheckSquare, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

interface ScoringGuideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'xp' | 'streak' | 'discipline';
}

export function ScoringGuideModal({ open, onOpenChange, defaultTab = 'xp' }: ScoringGuideModalProps) {
  const [tab, setTab] = useState<'xp' | 'streak' | 'discipline'>(defaultTab);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card border border-border text-foreground rounded-xl p-5 sm:p-6 shadow-xl max-h-[85vh] overflow-y-auto custom-scrollbar space-y-4">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <span>XP, Streaks & Discipline Guide</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Understand how experience points, multi-day streaks, and your rolling discipline score are calculated.
          </DialogDescription>
        </DialogHeader>

        {/* Segmented Tabs */}
        <div className="grid grid-cols-3 p-0.5 bg-muted/60 rounded-lg border border-border/50">
          <button
            onClick={() => setTab('xp')}
            className={`py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'xp'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>XP & Levels</span>
          </button>

          <button
            onClick={() => setTab('streak')}
            className={`py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'streak'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Streaks & Freeze</span>
          </button>

          <button
            onClick={() => setTab('discipline')}
            className={`py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              tab === 'discipline'
                ? 'bg-background text-foreground shadow-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-emerald-500" />
            <span>Discipline Score</span>
          </button>
        </div>

        {/* Tab 1: XP & Levels */}
        {tab === 'xp' && (
          <div className="space-y-3 pt-1">
            <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-2">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>How You Earn Experience Points (XP)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-card rounded-md border border-border space-y-0.5">
                  <div className="font-semibold text-primary">+10 XP per Habit</div>
                  <p className="text-[11px] text-muted-foreground">Checking off any daily habit in your Habit Matrix.</p>
                </div>
                <div className="p-2 bg-card rounded-md border border-border space-y-0.5">
                  <div className="font-semibold text-amber-600 dark:text-amber-400">+50 XP Perfect Day</div>
                  <p className="text-[11px] text-muted-foreground">Bonus awarded when all core habits are checked in a single day.</p>
                </div>
                <div className="p-2 bg-card rounded-md border border-border space-y-0.5">
                  <div className="font-semibold text-blue-600 dark:text-blue-400">+5 XP per Sprint Task</div>
                  <p className="text-[11px] text-muted-foreground">Completing tasks in your Action Sprints workspace.</p>
                </div>
                <div className="p-2 bg-card rounded-md border border-border space-y-0.5">
                  <div className="font-semibold text-destructive">-10 / -5 XP on Uncheck</div>
                  <p className="text-[11px] text-muted-foreground">If a habit or task is unchecked, XP is adjusted to maintain integrity.</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1.5">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-primary" />
                <span>Leveling Ranks</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Every <b>100 XP</b> unlocks a new mastery level (e.g. Novice $\rightarrow$ Habit Initiate $\rightarrow$ Consistency Builder $\rightarrow$ Focus Master $\rightarrow$ Routine Architect).
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Streaks & Freeze */}
        {tab === 'streak' && (
          <div className="space-y-3 pt-1">
            <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-2">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Consecutive Multi-Day Streaks</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your streak counts how many continuous calendar days you have successfully checked at least one daily habit or activated Streak Freeze.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 bg-card rounded-md border border-border space-y-0.5">
                  <div className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-500" /> Grace Period (At Risk)
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    If today’s habits aren’t completed yet, your streak enters the Grace Period until midnight. Check a habit to preserve it!
                  </p>
                </div>
                <div className="p-2 bg-card rounded-md border border-border space-y-0.5">
                  <div className="font-semibold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                    <Snowflake className="w-3 h-3 text-sky-500" /> Streak Freeze (❄️)
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Traveling or resting? Click <b>Freeze Day</b> in the sidebar to protect your streak and discipline score for the day.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-1">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Midnight Rollover Reset</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Every midnight, yesterday’s completed habits are saved to your permanent logbook, and today's checkboxes reset for a clean daily routine.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Discipline Score */}
        {tab === 'discipline' && (
          <div className="space-y-3 pt-1">
            <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-2">
              <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                <span>Dynamic Rolling Discipline Score (0% – 100%)</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your discipline score measures your actual execution consistency over a <b>rolling 7-day window</b> (the last 6 days + today).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 bg-card rounded-md border border-border space-y-0.5">
                  <div className="font-semibold text-foreground">60% Daily Habits</div>
                  <p className="text-[11px] text-muted-foreground">The proportion of your daily matrix habits completed each day.</p>
                </div>
                <div className="p-2 bg-card rounded-md border border-border space-y-0.5">
                  <div className="font-semibold text-foreground">40% Action Sprint Tasks</div>
                  <p className="text-[11px] text-muted-foreground">The proportion of tasks checked off in your daily sprint workspace.</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border space-y-2 text-xs">
              <div className="font-semibold text-foreground">How Lost Momentum Affects Discipline</div>
              <div className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
                <p>
                  • <b>Live Response</b>: Checking off habits and tasks immediately raises your score in real time.
                </p>
                <p>
                  • <b>Missed Days Penalty</b>: If you miss a day without activating Streak Freeze, that day is scored at 0%, pulling your 7-day average down (e.g. from 100% $\rightarrow$ 85% $\rightarrow$ 70%).
                </p>
                <p>
                  • <b>Recovery</b>: Resuming daily execution builds your score steadily back towards 100%.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end pt-1">
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4 h-8 rounded-md font-medium cursor-pointer"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
