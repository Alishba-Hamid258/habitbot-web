'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Timer, Sparkles, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

const MODE_DURATIONS: Record<TimerMode, number> = {
  focus: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
};

// Web Audio API Sound Synthesizer
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
  } catch {
    // Audio not allowed yet or not supported
  }
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
  const [timeLeft, setTimeLeft] = useState(MODE_DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [customTitle, setCustomTitle] = useState('Deep Work');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            playCompletionChime();
            toast.success(`🎉 Focus session "${customTitle}" complete! (+25 XP)`, {
              icon: '🍅',
            });
            return 0;
          }
          // Sound tick on last 5 seconds
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
  }, [isRunning, customTitle]);

  const handleModeChange = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(MODE_DURATIONS[newMode]);
  };

  const toggleTimer = () => {
    if (!isRunning) {
      playStartChime();
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(MODE_DURATIONS[mode]);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainderSecs).padStart(2, '0')}`;
  };

  const progress = ((MODE_DURATIONS[mode] - timeLeft) / MODE_DURATIONS[mode]) * 100;

  return (
    <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
          <Timer className="w-3.5 h-3.5 text-purple-400" />
          <span>Pomodoro Timer</span>
        </div>
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
          {mode === 'focus' ? '🍅 25m Focus' : mode === 'shortBreak' ? '☕ 5m Rest' : '🌴 15m Long'}
        </span>
      </div>

      {/* Mode Selectors */}
      <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-lg border border-white/5 text-[11px]">
        <button
          onClick={() => handleModeChange('focus')}
          className={`py-1 rounded font-medium transition-colors ${
            mode === 'focus' ? 'bg-purple-600/30 text-purple-200 border border-purple-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Focus
        </button>
        <button
          onClick={() => handleModeChange('shortBreak')}
          className={`py-1 rounded font-medium transition-colors ${
            mode === 'shortBreak' ? 'bg-cyan-600/30 text-cyan-200 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Break
        </button>
        <button
          onClick={() => handleModeChange('longBreak')}
          className={`py-1 rounded font-medium transition-colors ${
            mode === 'longBreak' ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Long
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
        <div className="text-[11px] text-slate-400 mt-0.5 truncate px-2">
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
