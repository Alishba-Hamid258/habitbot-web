'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Timer, Settings2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getActiveUser, getUserScopedData, setUserScopedData, addXP } from '@/lib/auth-storage';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak' | 'custom';

// Web Audio API Sound Synthesizer (Zero-latency tones)
function playAudioTone(frequency: number, type: OscillatorType = 'sine', duration: number = 0.15) {
  try {
    const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {}
}

function playStartChime() {
  playAudioTone(660, 'sine', 0.25);
}

function playTickSound() {
  playAudioTone(1200, 'triangle', 0.08);
}

function playCompletionChime() {
  setTimeout(() => playAudioTone(587.33, 'sine', 0.4), 0);
  setTimeout(() => playAudioTone(880.0, 'sine', 0.6), 250);
}

export function PomodoroTimer() {
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [totalDuration, setTotalDuration] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  
  // Custom adjustments
  const [customTitle, setCustomTitle] = useState('Deep Work');
  const [customMins, setCustomMins] = useState(25);
  const [showSettings, setShowSettings] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            playCompletionChime();
            
            // Log user-scoped focus history
            try {
              const active = getActiveUser();
              if (active) {
                const sessions = getUserScopedData<any[]>(active.id, 'focus_sessions', []);
                const gainedXP = Math.round(totalDuration / 60);
                sessions.push({
                  date: new Date().toISOString().split('T')[0],
                  mode: customTitle,
                  duration_mins: gainedXP,
                });
                setUserScopedData(active.id, 'focus_sessions', sessions);
                addXP(active.id, gainedXP);
              }
            } catch {}

            toast.success(`🎉 Focus session "${customTitle}" complete! (+${Math.round(totalDuration / 60)} XP)`, {
              icon: '🍅',
            });
            return 0;
          }
          if (prev <= 6 && prev > 1) {
            playTickSound();
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, customTitle, totalDuration]);

  const handleModeChange = (newMode: TimerMode, durationInMins: number) => {
    setIsRunning(false);
    setMode(newMode);
    const secs = durationInMins * 60;
    setTimeLeft(secs);
    setTotalDuration(secs);
    if (newMode === 'focus') setCustomTitle('Deep Work');
    if (newMode === 'shortBreak') setCustomTitle('Short Rest');
    if (newMode === 'longBreak') setCustomTitle('Long Rest');
  };

  const applyCustomSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Math.max(1, Math.min(240, Number(customMins) || 25));
    setMode('custom');
    setIsRunning(false);
    const secs = mins * 60;
    setTimeLeft(secs);
    setTotalDuration(secs);
    setShowSettings(false);
    toast.success(`Timer set to ${mins} mins for "${customTitle}"`);
  };

  const toggleTimer = () => {
    if (!isRunning) playStartChime();
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(totalDuration);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainderSecs).padStart(2, '0')}`;
  };

  const progress = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) * 100 : 0;

  return (
    <div className="p-3.5 bg-card rounded-xl border border-border space-y-3 transition-colors">
      {/* Header with Settings Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
          <Timer className="w-3.5 h-3.5 text-primary" />
          <span>Focus Timer</span>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors text-[11px] flex items-center gap-1 cursor-pointer font-medium"
        >
          <Settings2 className="w-3 h-3" />
          <span>{showSettings ? 'Close' : 'Adjust'}</span>
        </button>
      </div>

      {/* Manual Time & Name Adjustment Settings Box */}
      {showSettings && (
        <form onSubmit={applyCustomSettings} className="p-2.5 bg-muted/50 rounded-lg border border-border space-y-2 text-xs">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1 font-medium">Session Title / Activity</label>
            <Input
              type="text"
              placeholder="e.g. Physics Study, Coding, Reading"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="h-7 text-xs bg-background border-border text-foreground rounded-md"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1 font-medium">Duration (Minutes: 1 - 240)</label>
            <div className="flex gap-1.5">
              <Input
                type="number"
                min="1"
                max="240"
                value={customMins}
                onChange={(e) => setCustomMins(Number(e.target.value))}
                className="h-7 text-xs bg-background border-border text-foreground rounded-md"
              />
              <Button size="sm" type="submit" className="h-7 px-3 bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1 rounded-md font-medium">
                <Check className="w-3 h-3" /> Set
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Mode Quick Selectors */}
      <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-lg text-[11px] border border-border/40">
        <button
          onClick={() => handleModeChange('focus', 25)}
          className={`py-1 rounded-md font-medium transition-colors cursor-pointer ${
            mode === 'focus'
              ? 'bg-background text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          25m Focus
        </button>
        <button
          onClick={() => handleModeChange('shortBreak', 5)}
          className={`py-1 rounded-md font-medium transition-colors cursor-pointer ${
            mode === 'shortBreak'
              ? 'bg-background text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          5m Break
        </button>
        <button
          onClick={() => handleModeChange('longBreak', 15)}
          className={`py-1 rounded-md font-medium transition-colors cursor-pointer ${
            mode === 'longBreak'
              ? 'bg-background text-foreground shadow-xs font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          15m Long
        </button>
      </div>

      {/* Timer Display */}
      <div className="text-center py-1.5 relative">
        <motion.div
          key={timeLeft}
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          className="text-3xl font-bold font-mono tracking-tight text-foreground"
        >
          {formatTime(timeLeft)}
        </motion.div>
        <div className="text-[11px] text-muted-foreground mt-0.5 truncate px-2 font-medium">
          {customTitle}
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 pt-0.5">
        <Button
          size="sm"
          onClick={toggleTimer}
          className={`flex-1 font-medium h-8 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs ${
            isRunning
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5" /> Pause
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" /> Start Focus
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={resetTimer}
          className="bg-card hover:bg-muted border-border text-muted-foreground hover:text-foreground h-8 w-8 p-0 rounded-md cursor-pointer"
          title="Reset timer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
