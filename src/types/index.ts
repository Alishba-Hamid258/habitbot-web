// ================================
// HabitBot v5.0 — TypeScript Type Definitions
// ================================

export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface ChatMessage {
  id?: number;
  user_id?: number;
  role: 'system' | 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface ChatArchive {
  id: number;
  user_id: number;
  session_id: string;
  session_name: string;
  role: string;
  content: string;
  created_at: string;
}

export interface ChatSession {
  session_id: string;
  session_name: string;
  created_at: string;
}

export interface CoreHabit {
  id: number;
  user_id: number;
  habit_name: string;
}

export interface HabitLog {
  id: number;
  user_id: number;
  date: string;
  habit: string;
  category: string;
}

export interface Todo {
  id: number;
  user_id: number;
  task: string;
  priority: 'High' | 'Medium' | 'Low';
  time: string;
  done: boolean;
}

export interface CompletedTask {
  id: number;
  user_id: number;
  task: string;
  completed_at: string;
}

export interface Reflection {
  id: number;
  user_id: number;
  date: string;
  went_well: string;
  friction: string;
}

export interface FocusSession {
  id: number;
  user_id: number;
  date: string;
  mode: string;
  duration_mins: number;
}

export interface MediaHistory {
  id: number;
  user_id: number;
  date: string;
  url: string;
  title: string;
}

export interface Badge {
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
}

export interface XPInfo {
  level: number;
  name: string;
  totalXP: number;
  currentXP: number;
  nextThreshold: number;
  progress: number;
}

export interface AdminStats {
  total_users: number;
  total_habits: number;
  total_focus_mins: number;
  total_tasks: number;
  total_chat_archives: number;
  users_list: AdminUser[];
}

export interface AdminUser {
  id: number;
  username: string;
  created_at: string;
  habits_count: number;
  focus_mins: number;
}

export const LEVEL_NAMES = [
  '🥉 Novice Starter',
  '🥈 Habit Seeker',
  '🥇 Routine Builder',
  '💪 Discipline Warrior',
  '🔥 Streak Master',
  '⚡ Focus Champion',
  '🧠 Mind Architect',
  '🌟 Life Engineer',
  '💎 Elite Performer',
  '👑 Discipline Grandmaster',
] as const;

export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500] as const;
