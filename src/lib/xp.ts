import { XPInfo, LEVEL_NAMES, LEVEL_THRESHOLDS } from '@/types';

export const XP_PER_HABIT = 10;
export const XP_PER_FOCUS_MIN = 1;
export const XP_PER_REFLECTION = 15;
export const XP_PER_TASK = 5;

/**
 * Calculates user's total XP from raw counts
 */
export function calculateTotalXP(
  habitCount: number = 0,
  focusMins: number = 0,
  reflectionCount: number = 0,
  completedTaskCount: number = 0
): number {
  return (
    habitCount * XP_PER_HABIT +
    focusMins * XP_PER_FOCUS_MIN +
    reflectionCount * XP_PER_REFLECTION +
    completedTaskCount * XP_PER_TASK
  );
}

/**
 * Determines level, tier title, and progress percentage given total XP
 */
export function calculateLevel(totalXP: number): XPInfo {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }

  const name = LEVEL_NAMES[level - 1] || LEVEL_NAMES[LEVEL_NAMES.length - 1];
  const currentThreshold = LEVEL_THRESHOLDS[level - 1];
  const nextThreshold = level < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[level] : LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 1500;

  const currentLevelXP = totalXP - currentThreshold;
  const neededXP = nextThreshold - currentThreshold;
  const progress = Math.min(100, Math.max(0, Math.round((currentLevelXP / neededXP) * 100)));

  return {
    level,
    name,
    totalXP,
    currentXP: currentLevelXP,
    nextThreshold: neededXP,
    progress
  };
}
