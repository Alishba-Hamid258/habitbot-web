'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Timer, Settings2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getActiveUser, getUserScopedData, setUserScopedData } from '@/lib/auth-storage';

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
                sessions.push({
                  date: new Date().toISOString().split('T')[0],
                  mode: customTitle,
                  duration_mins: Math.round(totalDuration / 60),
                });
                setUserScopedData(active.id, 'focus_sessions', sessions);
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
    <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
      {/* Header with Settings Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
          <Timer className="w-3.5 h-3.5 text-purple-400" />
          <span>Pomodoro Timer</span>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-slate-400 hover:text-cyan-300 p-1 rounded transition-colors text-[10px] flex items-center gap-1"
        >
          <Settings2 className="w-3 h-3" />
          <span>{showSettings ? 'Close' : 'Adjust'}</span>
        </button>
      </div>

      {/* Manual Time & Name Adjustment Settings Box */}
      {showSettings && (
        <form onSubmit={applyCustomSettings} className="p-2.5 bg-slate-950/80 rounded-lg border border-purple-500/30 space-y-2 text-xs">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Session Title / Activity</label>
            <Input
              type="text"
              placeholder="e.g. Physics Study, Coding, Meditation"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="h-7 text-xs bg-slate-900 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Duration (Minutes: 1 - 240)</label>
            <div className="flex gap-1.5">
              <Input
                type="number"
                min="1"
                max="240"
                value={customMins}
                onChange={(e) => setCustomMins(Number(e.target.value))}
                className="h-7 text-xs bg-slate-900 border-white/10 text-white"
              />
              <Button size="sm" type="submit" className="h-7 px-3 gradient-button text-xs gap-1">
                <Check className="w-3 h-3" /> Set
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* Mode Quick Selectors */}
      <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-lg border border-white/5 text-[11px]">
        <button
          onClick={() => handleModeChange('focus', 25)}
          className={`py-1 rounded font-medium transition-colors ${
            mode === 'focus' ? 'bg-purple-600/30 text-purple-200 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          25m Focus
        </button>
        <button
          onClick={() => handleModeChange('shortBreak', 5)}
          className={`py-1 rounded font-medium transition-colors ${
            mode === 'shortBreak' ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          5m Break
        </button>
        <button
          onClick={() => handleModeChange('longBreak', 15)}
          className={`py-1 rounded font-medium transition-colors ${
            mode === 'longBreak' ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          15m Long
        </button>
      </div>

      {/* Timer Display */}
      <div className="text-center py-2 relative">
        <motion.div
          key={timeLeft}
          initial={{ scale: 0.98 }}
          animate={{ scale: 1 }}
          className="text-4xl font-extrabold font-mono tracking-tight text-white drop-shadow-md"
        >
          {formatTime(timeLeft)}
        </motion.div>
        <div className="text-[11px] text-slate-300 mt-0.5 truncate px-2 font-medium">
          🎯 {customTitle}
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-300 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={toggleTimer}
          className={`flex-1 font-semibold py-4 rounded-lg flex items-center justify-center gap-1.5 shadow-md ${
            isRunning
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'gradient-button shadow-purple-500/20'
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
          className="bg-slate-800/80 hover:bg-slate-700 border-white/10 text-slate-300 p-2.5 rounded-lg"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
