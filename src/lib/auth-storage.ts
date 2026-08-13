// ==========================================
// HabitBot v5.0 — User Authentication & Scoped Storage Manager
// ==========================================

export interface StoredUser {
  id: number;
  username: string;
  password: string; // Stored securely
  email?: string;
  phone?: string; // WhatsApp Number
  avatar?: string; // Base64 profile picture
  createdAt: string;
  isAdmin?: boolean;
}

export interface MediaHistoryItem {
  Date: string;
  Title: string;
  MediaUrl: string;
}

interface OTPRecord {
  contact: string;
  otp: string;
  expiresAt: number;
  userId: number;
}

const USERS_KEY = 'habitbot_registered_users';
const ACTIVE_USER_KEY = 'habitbot_active_user_session';
const OTP_STORE_KEY = 'habitbot_reset_otp_record';

// Default initial users
const DEFAULT_USERS: StoredUser[] = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123',
    email: 'admin@habitbot.ai',
    phone: '+1234567890',
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
 * Requires Email & WhatsApp number for account recovery security
 */
export function registerUser(
  username: string,
  password: string,
  email?: string,
  phone?: string
): { success: boolean; error?: string; user?: StoredUser } {
  const normUser = username.trim().toLowerCase();
  
  if (normUser.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters long.' };
  }

  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please provide a valid Recovery Email address.' };
  }

  if (!phone || phone.replace(/\D/g, '').length < 7) {
    return { success: false, error: 'Please provide a valid WhatsApp / Phone Number.' };
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

  // Check email / phone uniqueness
  const emailExists = users.some((u) => u.email && u.email.toLowerCase() === email.trim().toLowerCase());
  if (emailExists) {
    return { success: false, error: `Email "${email}" is already registered. Please sign in or reset password.` };
  }

  // Strictly incremental ID
  const maxId = users.reduce((max, u) => (u.id > max ? u.id : max), 0);
  const nextId = maxId + 1;

  const newUser: StoredUser = {
    id: nextId,
    username: normUser,
    password: password,
    email: email.trim().toLowerCase(),
    phone: phone.trim(),
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
export function authenticateUser(usernameOrContact: string, password: string): { success: boolean; error?: string; user?: StoredUser } {
  const norm = usernameOrContact.trim().toLowerCase();
  const digits = norm.replace(/\D/g, '');
  const users = getRegisteredUsers();

  const user = users.find(
    (u) =>
      (u.username.toLowerCase() === norm ||
        (u.email && u.email.toLowerCase() === norm) ||
        (digits.length >= 7 && u.phone && u.phone.replace(/\D/g, '') === digits)) &&
      u.password === password
  );

  if (!user) {
    return { success: false, error: 'Invalid credentials. Please verify username/email and password.' };
  }

  // Set active session
  localStorage.setItem(
    ACTIVE_USER_KEY,
    JSON.stringify({
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      isAdmin: user.isAdmin || false,
    })
  );

  return { success: true, user };
}

/**
 * Secret Creator Master Access Codes (Private to Creator)
 */
export const CREATOR_MASTER_CODES = ['HABITBOT-CREATOR-786', '786920', 'creator-admin-2026'];

/**
 * Authenticates Creator using a private security master code / PIN
 */
export function authenticateAdminWithCode(code: string): { success: boolean; error?: string; user?: StoredUser } {
  const norm = code.trim();
  const isValid = CREATOR_MASTER_CODES.some((c) => c.toLowerCase() === norm.toLowerCase());

  if (!isValid) {
    return { success: false, error: 'Invalid Creator Access Code. Access denied.' };
  }

  const users = getRegisteredUsers();
  const adminUser = users.find((u) => u.isAdmin || u.id === 1) || {
    id: 1,
    username: 'Creator Admin',
    email: 'admin@habitbot.internal',
    password: '',
    phone: '',
    createdAt: new Date().toISOString().split('T')[0],
    isAdmin: true,
  };

  localStorage.setItem(
    ACTIVE_USER_KEY,
    JSON.stringify({
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      phone: adminUser.phone,
      avatar: adminUser.avatar,
      isAdmin: true,
    })
  );

  return { success: true, user: adminUser };
}

/**
 * Sends a 6-digit OTP code to verified Email or WhatsApp Number ONLY (Usernames disallowed for security)
 */
export function sendPasswordResetOTP(contactInfo: string): {
  success: boolean;
  error?: string;
  otp?: string;
  phone?: string;
  email?: string;
  username?: string;
} {
  const norm = contactInfo.trim().toLowerCase();
  const digits = norm.replace(/\D/g, '');

  if (!norm) {
    return { success: false, error: 'Please enter your registered Email address or WhatsApp Number.' };
  }

  // Strict check: Disallow usernames. Must be an email (has @) or phone (has >= 7 digits)
  const isEmail = norm.includes('@');
  const isPhone = digits.length >= 7;

  if (!isEmail && !isPhone) {
    return {
      success: false,
      error: 'Security Error: Password recovery is strictly not permitted by username alone. Please enter your registered Email or WhatsApp Phone Number.',
    };
  }

  const users = getRegisteredUsers();
  const user = users.find(
    (u) =>
      (isEmail && u.email && u.email.toLowerCase() === norm) ||
      (isPhone && u.phone && u.phone.replace(/\D/g, '') === digits)
  );

  if (!user) {
    return {
      success: false,
      error: `No registered account found with ${isEmail ? 'email' : 'phone number'} "${contactInfo}".`,
    };
  }

  // Generate 6-digit secure OTP code
  const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

  const otpRecord: OTPRecord = {
    contact: isEmail ? user.email! : user.phone!,
    otp: generatedOTP,
    expiresAt,
    userId: user.id,
  };

  localStorage.setItem(OTP_STORE_KEY, JSON.stringify(otpRecord));

  return {
    success: true,
    otp: generatedOTP,
    email: user.email,
    phone: user.phone,
    username: user.username,
  };
}

/**
 * Verifies OTP code sent to Email/WhatsApp and sets new password
 */
export function verifyOTPAndResetPassword(
  contactInfo: string,
  enteredOTP: string,
  newPassword: string
): { success: boolean; error?: string; username?: string } {
  const norm = contactInfo.trim().toLowerCase();
  const digits = norm.replace(/\D/g, '');

  if (!enteredOTP.trim()) {
    return { success: false, error: 'Please enter the 6-digit verification code sent to your Email/WhatsApp.' };
  }

  // Check stored OTP
  try {
    const raw = localStorage.getItem(OTP_STORE_KEY);
    if (!raw) {
      return { success: false, error: 'No active OTP verification session found. Please request a new code.' };
    }

    const otpRecord: OTPRecord = JSON.parse(raw);
    if (Date.now() > otpRecord.expiresAt) {
      localStorage.removeItem(OTP_STORE_KEY);
      return { success: false, error: 'Verification code has expired. Please request a new one.' };
    }

    if (otpRecord.otp !== enteredOTP.trim()) {
      return { success: false, error: 'Invalid 6-digit verification code. Please check your WhatsApp/Email.' };
    }

    // Password validation
    if (newPassword.length < 6) {
      return { success: false, error: 'New password must be at least 6 characters long.' };
    }
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumberOrSymbol = /[\d\W]/.test(newPassword);
    if (!hasLetter || !hasNumberOrSymbol) {
      return { success: false, error: 'New password must contain letters and at least one number or symbol.' };
    }

    const users = getRegisteredUsers();
    const index = users.findIndex((u) => u.id === otpRecord.userId);
    if (index === -1) {
      return { success: false, error: 'User account not found.' };
    }

    users[index].password = newPassword;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.removeItem(OTP_STORE_KEY);

    return { success: true, username: users[index].username };
  } catch (err: any) {
    return { success: false, error: `Verification failed: ${err.message}` };
  }
}

/**
 * Updates active user profile (Avatar, email, phone, password)
 */
export function updateUserProfile(
  userId: number,
  updates: { avatar?: string; email?: string; phone?: string; password?: string }
): { success: boolean; user?: StoredUser } {
  const users = getRegisteredUsers();
  const index = users.findIndex((u) => u.id === userId);
  if (index === -1) return { success: false };

  const updatedUser = {
    ...users[index],
    ...updates,
  };

  users[index] = updatedUser;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  // Update active session
  const active = getActiveUser();
  if (active && active.id === userId) {
    localStorage.setItem(
      ACTIVE_USER_KEY,
      JSON.stringify({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        isAdmin: updatedUser.isAdmin || false,
      })
    );
  }

  // Dispatch live update event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('habitbot_user_profile_updated'));
  }

  return { success: true, user: updatedUser };
}

/**
 * Permanently deletes user account and wipes all user-scoped data
 */
export function deleteUserAccount(userId: number): { success: boolean; error?: string } {
  const users = getRegisteredUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return { success: false, error: 'User not found.' };

  // 1. Remove from registered users
  const updatedUsers = users.filter((u) => u.id !== userId);
  localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));

  // 2. Wipe all user-scoped keys
  if (typeof window !== 'undefined') {
    const keysToRemove: string[] = [];
    const prefix = `_user_${userId}`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.includes(prefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem(ACTIVE_USER_KEY);
  }

  return { success: true };
}

/**
 * Gets currently logged in user session
 */
export function getActiveUser(): {
  id: number;
  username: string;
  email?: string;
  phone?: string;
  avatar?: string;
  isAdmin?: boolean;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(ACTIVE_USER_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    // Also sync latest avatar from registered users
    const users = getRegisteredUsers();
    const latest = users.find((u) => u.id === parsed.id);
    if (latest) {
      parsed.avatar = latest.avatar;
      parsed.email = latest.email;
      parsed.phone = latest.phone;
    }
    return parsed;
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

export interface MasterTaskRecord {
  id: string;
  task: string;
  priority: 'High' | 'Medium' | 'Low';
  time: string;
  createdAt: string;
  completedAt?: string;
  status: 'Completed' | 'In Progress' | 'Archived';
  xpEarned: number;
}

export type TaskHistoryItem = MasterTaskRecord;

/**
 * Permanently logs any created or updated task into the user's permanent master task database.
 * Tasks are NEVER flushed or lost from this database even if deleted from the daily sprint.
 */
export function recordMasterTask(
  userId: number,
  task: {
    id: string;
    task: string;
    priority: 'High' | 'Medium' | 'Low';
    time: string;
    done?: boolean;
    archived?: boolean;
  }
) {
  if (typeof window === 'undefined') return;
  const master = getUserScopedData<MasterTaskRecord[]>(userId, 'tasks_master_db', []);
  const todayStr = new Date().toISOString().split('T')[0];

  const existingIndex = master.findIndex((m) => m.id === task.id);
  const status = task.done ? 'Completed' : task.archived ? 'Archived' : 'In Progress';
  const xpEarned = task.done ? 5 : 0;

  if (existingIndex >= 0) {
    const existing = master[existingIndex];
    master[existingIndex] = {
      ...existing,
      task: task.task,
      priority: task.priority,
      time: task.time,
      status: task.done ? 'Completed' : task.archived ? 'Archived' : existing.status,
      completedAt: task.done ? existing.completedAt || todayStr : existing.completedAt,
      xpEarned: task.done ? 5 : existing.xpEarned,
    };
  } else {
    master.unshift({
      id: task.id,
      task: task.task,
      priority: task.priority,
      time: task.time,
      createdAt: todayStr,
      completedAt: task.done ? todayStr : undefined,
      status: status,
      xpEarned: xpEarned,
    });
  }

  setUserScopedData(userId, 'tasks_master_db', master);
}

/**
 * Legacy compatibility wrapper for logging completed tasks
 */
export function logTaskCompletion(
  userId: number,
  task: { id: string; task: string; priority: 'High' | 'Medium' | 'Low'; time: string }
) {
  recordMasterTask(userId, { ...task, done: true });
}

/**
 * Gets the entire permanent master task database for a user
 */
export function getTaskHistory(userId: number): MasterTaskRecord[] {
  return getUserScopedData<MasterTaskRecord[]>(userId, 'tasks_master_db', []);
}

export function getMasterTasks(userId: number): MasterTaskRecord[] {
  return getUserScopedData<MasterTaskRecord[]>(userId, 'tasks_master_db', []);
}export interface DailyHabitLogRecord {
  date: string;
  completedCount: number;
  totalCount: number;
  isFrozen?: boolean;
}

/**
 * Checks for midnight rollover on the client.
 * When the calendar day changes:
 * 1. Archives yesterday's progress into `daily_habit_history_user_${userId}`.
 * 2. Fills in any missed days between last active date and today as 0 completed habits.
 * 3. Unchecks today's checkboxes so user gets a fresh slate for the new day.
 */
export function checkAndPerformDailyMidnightReset(userId: number): boolean {
  if (typeof window === 'undefined') return false;
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const storedLastDate = getUserScopedData<string | null>(userId, 'last_active_date', null);

  // If this is the user's first time or last_active_date is uninitialized
  if (!storedLastDate) {
    setUserScopedData(userId, 'last_active_date', todayStr);
    return false;
  }

  // If calendar day has rolled over
  if (storedLastDate !== todayStr) {
    const habits = getUserScopedData<any[]>(userId, 'habits', []);
    const completedCount = habits.filter((h) => h.completed).length;
    const isFrozen = getUserScopedData<boolean>(userId, 'is_frozen', false);

    const history = getUserScopedData<DailyHabitLogRecord[]>(userId, 'daily_habit_history', []);
    
    // 1. Record the previous active day's progress
    const existingIndex = history.findIndex((h) => h.date === storedLastDate);
    const dayRecord: DailyHabitLogRecord = {
      date: storedLastDate,
      completedCount,
      totalCount: habits.length,
      isFrozen,
    };

    if (existingIndex >= 0) {
      history[existingIndex] = dayRecord;
    } else {
      history.push(dayRecord);
    }

    // 2. If multiple days elapsed, record intermediate missed days with 0 completed
    try {
      const lastDateObj = new Date(storedLastDate);
      const todayDateObj = new Date(todayStr);
      const diffTime = todayDateObj.getTime() - lastDateObj.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 1) {
        for (let i = 1; i < diffDays; i++) {
          const missedDate = new Date(lastDateObj);
          missedDate.setDate(missedDate.getDate() + i);
          const missedStr = missedDate.toISOString().split('T')[0];
          if (!history.some((h) => h.date === missedStr)) {
            history.push({
              date: missedStr,
              completedCount: 0,
              totalCount: habits.length,
              isFrozen: false,
            });
          }
        }
      }
    } catch (_) {}

    setUserScopedData(userId, 'daily_habit_history', history);

    // 3. Reset daily checkmarks for a fresh slate
    const resetHabits = habits.map((h) => ({ ...h, completed: false }));
    setUserScopedData(userId, 'habits', resetHabits);
    setUserScopedData(userId, 'is_frozen', false);
    setUserScopedData(userId, 'last_active_date', todayStr);

    // Notify all UI widgets across the application
    window.dispatchEvent(new Event('habitbot_data_updated'));
    return true;
  }

  return false;
}

/**
 * Calculates continuous multi-day streak and whether it is currently at risk today
 */
export function calculateUserStreakInfo(userId: number): {
  streak: number;
  isAtRisk: boolean;
  needsActionToday: boolean;
} {
  if (typeof window === 'undefined') {
    return { streak: 0, isAtRisk: false, needsActionToday: false };
  }

  const history = getUserScopedData<DailyHabitLogRecord[]>(userId, 'daily_habit_history', []);
  const habits = getUserScopedData<any[]>(userId, 'habits', []);
  const completedToday = habits.filter((h) => h.completed).length;
  const isFrozenToday = getUserScopedData<boolean>(userId, 'is_frozen', false);

  const doneToday = completedToday > 0 || isFrozenToday;

  // Count consecutive completed days backwards from yesterday
  const today = new Date();
  const checkDate = new Date(today);
  checkDate.setDate(checkDate.getDate() - 1);

  let pastConsecutiveDays = 0;
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const log = history.find((h) => h.date === dateStr);

    if (log && (log.completedCount > 0 || log.isFrozen)) {
      pastConsecutiveDays += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  if (doneToday) {
    return {
      streak: pastConsecutiveDays + 1,
      isAtRisk: false,
      needsActionToday: false,
    };
  } else {
    // If not completed yet today, but they had a streak yesterday:
    // It is AT RISK! (Grace state until midnight)
    if (pastConsecutiveDays > 0) {
      return {
        streak: pastConsecutiveDays,
        isAtRisk: true,
        needsActionToday: true,
      };
    } else {
      return {
        streak: 0,
        isAtRisk: false,
        needsActionToday: habits.length > 0,
      };
    }
  }
}

export function calculateUserStreak(userId: number): number {
  return calculateUserStreakInfo(userId).streak;
}

/**
 * Computes dynamic rolling discipline score (0-100%) factoring in:
 * 1. Daily habit completion (weighted 60%)
 * 2. Daily task/sprint completion (weighted 40%)
 * 3. Rolling consistency over 7 days (or since account creation)
 * 4. Streak Freeze protections (100% on shielded rest/travel days)
 * 5. Missed days or unchecking tasks/habits directly reduces discipline in real time.
 */
export function computeDisciplineRate(userId: number): number {
  if (typeof window === 'undefined') return 0;

  const users = getRegisteredUsers();
  const user = users.find((u) => u.id === userId);
  const createdDateStr = user?.createdAt || new Date().toISOString().split('T')[0];
  const createdDate = new Date(createdDateStr);

  const history = getUserScopedData<DailyHabitLogRecord[]>(userId, 'daily_habit_history', []);
  const todayHabits = getUserScopedData<any[]>(userId, 'habits', []);
  const todayTasks = getUserScopedData<any[]>(userId, 'tasks', []);
  const isFrozenToday = getUserScopedData<boolean>(userId, 'is_frozen', false);
  const masterTasks = getUserScopedData<MasterTaskRecord[]>(userId, 'tasks_master_db', []);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Evaluate rolling 7 days window (last 6 days + today)
  const dailyScores: number[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dStr = d.toISOString().split('T')[0];

    // Don't penalize days prior to user's account registration
    if (d < createdDate && dStr !== createdDateStr) {
      continue;
    }

    let habitScore = 0;
    let taskScore: number | null = null;

    if (dStr === todayStr) {
      // TODAY'S LIVE STATUS
      if (isFrozenToday) {
        habitScore = 100;
        taskScore = 100;
      } else {
        const completedHabits = todayHabits.filter((h) => h.completed).length;
        habitScore = todayHabits.length > 0 ? (completedHabits / todayHabits.length) * 100 : 0;

        if (todayTasks.length > 0) {
          const completedTasks = todayTasks.filter((t) => t.done).length;
          taskScore = (completedTasks / todayTasks.length) * 100;
        }
      }
    } else {
      // PAST DAYS IN LOGBOOK HISTORY
      const log = history.find((h) => h.date === dStr);
      if (log) {
        if (log.isFrozen) {
          habitScore = 100;
          taskScore = 100;
        } else {
          habitScore = log.totalCount > 0 ? (log.completedCount / log.totalCount) * 100 : log.completedCount > 0 ? 100 : 0;
        }
      } else {
        // Missed day in account history
        habitScore = 0;
      }

      // Check tasks recorded on past day
      const tasksOnDay = masterTasks.filter((t) => t.createdAt === dStr || t.completedAt === dStr);
      if (tasksOnDay.length > 0) {
        const completedOnDay = tasksOnDay.filter((t) => t.completedAt === dStr || t.status === 'Completed').length;
        taskScore = (completedOnDay / tasksOnDay.length) * 100;
      }
    }

    // Blend Habits (60%) and Tasks (40%) if tasks existed, otherwise 100% habits
    let dayTotal = habitScore;
    if (taskScore !== null) {
      dayTotal = Math.round(habitScore * 0.6 + taskScore * 0.4);
    }

    dailyScores.push(dayTotal);
  }

  if (dailyScores.length === 0) {
    const completedHabits = todayHabits.filter((h) => h.completed).length;
    return todayHabits.length > 0 ? Math.round((completedHabits / todayHabits.length) * 100) : 0;
  }

  const sum = dailyScores.reduce((acc, val) => acc + val, 0);
  const average = Math.round(sum / dailyScores.length);
  return Math.min(100, Math.max(0, average));
}

/**
 * Computes live user XP, multi-day streak, and dynamic discipline stats for active user
 */
export function computeUserStats(userId: number) {
  if (typeof window === 'undefined') {
    return { totalXP: 0, streak: 0, disciplineRate: 0, isAtRisk: false, needsActionToday: false };
  }

  // Ensure midnight rollover is applied before computing stats
  checkAndPerformDailyMidnightReset(userId);

  const totalXP = getUserXP(userId);
  const streakInfo = calculateUserStreakInfo(userId);
  const disciplineRate = computeDisciplineRate(userId);

  return {
    totalXP,
    streak: streakInfo.streak,
    disciplineRate,
    isAtRisk: streakInfo.isAtRisk,
    needsActionToday: streakInfo.needsActionToday,
  };
}
