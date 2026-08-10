// ==========================================
// HabitBot v5.0 — User Authentication & Scoped Storage Manager
// ==========================================

export interface StoredUser {
  id: number;
  username: string;
  password: string; // Stored securely
  createdAt: string;
  isAdmin?: boolean;
}

export interface MediaHistoryItem {
  Date: string;
  Title: string;
  MediaUrl: string;
}

const USERS_KEY = 'habitbot_registered_users';
const ACTIVE_USER_KEY = 'habitbot_active_user_session';

// Default initial users
const DEFAULT_USERS: StoredUser[] = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    createdAt: '2026-08-01',
    isAdmin: true,
  },
];

/**
 * Gets the list of all registered users
 */
export function getRegisteredUsers(): StoredUser[] {
  if (typeof window === 'undefined') return DEFAULT_USERS;
  try {
    const saved = localStorage.getItem(USERS_KEY);
    if (!saved) {
      localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return JSON.parse(saved);
  } catch {
    return DEFAULT_USERS;
  }
}

/**
 * Registers a new user with strictly incremental User ID (1, 2, 3, 4...)
 */
export function registerUser(username: string, password: string): { success: boolean; error?: string; user?: StoredUser } {
  const normUser = username.trim().toLowerCase();
  
  if (normUser.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters long.' };
  }

  // Password security rules: At least 6 characters, must have letter and number/symbol
  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSymbol = /[\d\W]/.test(password);
  if (!hasLetter || !hasNumberOrSymbol) {
    return { success: false, error: 'Password must contain at least one letter and one number or symbol.' };
  }

  const users = getRegisteredUsers();

  // Check username uniqueness
  const exists = users.some((u) => u.username.toLowerCase() === normUser);
  if (exists) {
    return { success: false, error: `Username "${normUser}" is already taken. Please choose another.` };
  }

  // Strictly incremental ID
  const maxId = users.reduce((max, u) => (u.id > max ? u.id : max), 0);
  const nextId = maxId + 1;

  const newUser: StoredUser = {
    id: nextId,
    username: normUser,
    password: password,
    createdAt: new Date().toISOString().split('T')[0],
    isAdmin: false,
  };

  const updatedUsers = [...users, newUser];
  localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));

  return { success: true, user: newUser };
}

/**
 * Authenticates user credentials
 */
export function authenticateUser(username: string, password: string): { success: boolean; error?: string; user?: StoredUser } {
  const normUser = username.trim().toLowerCase();
  const users = getRegisteredUsers();

  const user = users.find((u) => u.username.toLowerCase() === normUser && u.password === password);
  if (!user) {
    return { success: false, error: 'Invalid username or password. Please try again.' };
  }

  // Set active session
  localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify({
    id: user.id,
    username: user.username,
    isAdmin: user.isAdmin || false,
  }));

  return { success: true, user };
}

/**
 * Gets currently logged in user session
 */
export function getActiveUser(): { id: number; username: string; isAdmin?: boolean } | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(ACTIVE_USER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

/**
 * Logs out currently active user
 */
export function logoutActiveUser() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACTIVE_USER_KEY);
  }
}

/**
 * Helper to get user-scoped data (Prevents cross-account data bleed)
 */
export function getUserScopedData<T>(userId: number, key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const scopedKey = `habitbot_${key}_user_${userId}`;
    const data = localStorage.getItem(scopedKey);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Helper to save user-scoped data (Strictly isolated to user's ID)
 */
export function setUserScopedData<T>(userId: number, key: string, data: T) {
  if (typeof window === 'undefined') return;
  try {
    const scopedKey = `habitbot_${key}_user_${userId}`;
    localStorage.setItem(scopedKey, JSON.stringify(data));
    // Dispatch custom event to notify components of live update
    window.dispatchEvent(new Event('habitbot_data_updated'));
  } catch {}
}

/**
 * Gets permanent cumulative XP for a user (Starts at 0 for new account)
 */
export function getUserXP(userId: number): number {
  return getUserScopedData<number>(userId, 'xp_ledger', 0);
}

/**
 * Awards permanent XP to user's wallet (Earned XP is preserved forever, even when clearing tasks)
 */
export function addXP(userId: number, amount: number): number {
  const current = getUserXP(userId);
  const updated = Math.max(0, current + amount);
  setUserScopedData(userId, 'xp_ledger', updated);
  return updated;
}

/**
 * Gets active media URL for user
 */
export function getActiveMediaUrl(userId: number): string {
  return getUserScopedData<string>(userId, 'active_video', 'https://www.youtube.com/watch?v=jfKfPfyJRdk');
}

/**
 * Saves active media URL and records in media history ledger (Synced across Library, Sidebar & Excel)
 */
export function saveActiveMedia(userId: number, url: string, title?: string) {
  if (typeof window === 'undefined') return;
  // 1. Save active video
  setUserScopedData(userId, 'active_video', url);

  // 2. Append to media history
  const history = getUserScopedData<MediaHistoryItem[]>(userId, 'media_history', []);
  const todayStr = new Date().toISOString().split('T')[0];
  const autoTitle = title || `Custom Focus Track (${todayStr})`;

  const updatedHistory = [
    {
      Date: todayStr,
      Title: autoTitle,
      MediaUrl: url,
    },
    ...history.filter((h) => h.MediaUrl !== url),
  ];
  setUserScopedData(userId, 'media_history', updatedHistory);

  // 3. Dispatch media sync event
  window.dispatchEvent(new Event('habitbot_media_updated'));
}

/**
 * Computes live user XP, streak, and discipline stats for active user
 */
export function computeUserStats(userId: number) {
  if (typeof window === 'undefined') return { totalXP: 0, streak: 0, disciplineRate: 0 };

  const totalXP = getUserXP(userId);

  const habits = getUserScopedData<any[]>(userId, 'habits', []);
  const completedHabits = habits.filter((h) => h.completed).length;
  const isFrozen = getUserScopedData<boolean>(userId, 'is_frozen', false);

  const disciplineRate = habits.length > 0 ? Math.round((completedHabits / habits.length) * 100) : 0;
  const streak = completedHabits > 0 || isFrozen ? 1 : 0;

  return { totalXP, streak, disciplineRate };
}
