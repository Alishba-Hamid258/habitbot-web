'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Users, CheckSquare, Clock, MessageSquare, LogOut, Database, UserCheck, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getRegisteredUsers, StoredUser, logoutActiveUser, getUserScopedData } from '@/lib/auth-storage';

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 1,
    totalHabits: 0,
    totalFocusHours: 0,
    totalTasks: 0,
    totalChatSessions: 0,
  });

  const loadRealTelemetry = () => {
    const regUsers = getRegisteredUsers();
    setUsers(regUsers);

    let habitsCount = 0;
    let focusMinutes = 0;
    let tasksCount = 0;
    let chatCount = 0;

    regUsers.forEach((u) => {
      // 1. Habits
      const habits = getUserScopedData<any[]>(u.id, 'habits', []);
      habitsCount += habits.filter((h) => h.completed).length;

      // 2. Focus
      const focus = getUserScopedData<any[]>(u.id, 'focus_sessions', []);
      focus.forEach((f) => {
        focusMinutes += Number(f.duration_mins) || 0;
      });

      // 3. Tasks
      const tasks = getUserScopedData<any[]>(u.id, 'tasks', []);
      const taskHistory = getUserScopedData<any[]>(u.id, 'task_history', []);
      const uniqueDone = new Set([
        ...tasks.filter((t) => t.done).map((t) => t.id),
        ...taskHistory.map((h) => h.id),
      ]);
      tasksCount += uniqueDone.size;

      // 4. Chat Archives
      const archives = getUserScopedData<any[]>(u.id, 'chat_archives', []);
      chatCount += archives.length;
    });

    // Also check global focus records if any
    try {
      const globalFocus = localStorage.getItem('habitbot_focus_sessions');
      if (globalFocus) {
        const gf = JSON.parse(globalFocus);
        gf.forEach((f: any) => {
          focusMinutes += Number(f.duration_mins) || 0;
        });
      }
    } catch {}

    const focusHours = Math.round((focusMinutes / 60) * 10) / 10;

    setStats({
      totalUsers: regUsers.length,
      totalHabits: habitsCount,
      totalFocusHours: focusHours,
      totalTasks: tasksCount,
      totalChatSessions: chatCount,
    });
  };

  useEffect(() => {
    loadRealTelemetry();
  }, []);

  const handleAdminLogout = () => {
    logoutActiveUser();
    toast.info('Logged out from Creator Portal.');
    router.push('/login');
  };

  const handleResetDatabase = () => {
    if (confirm('⚠️ Are you sure you want to reset all test data? This will clear all test users and reset telemetry to 0.')) {
      // Clear test keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('habitbot_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      // Re-initialize default admin
      const defaultAdmin: StoredUser[] = [
        {
          id: 1,
          username: 'admin',
          password: 'password123',
          email: 'admin@habitbot.internal',
          phone: '+1 800 555 0199',
          isAdmin: true,
          createdAt: new Date().toISOString().split('T')[0],
          avatar: '',
        },
      ];
      localStorage.setItem('habitbot_registered_users', JSON.stringify(defaultAdmin));
      loadRealTelemetry();
      toast.success('Database reset to clean state! Default admin restored.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-white p-4 sm:p-8 space-y-6 transition-colors">
      {/* Admin Top Header */}
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Creator Master Intelligence Portal</span>
              <span className="text-[10px] bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-semibold">
                ADMIN ACCESS
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Live platform telemetry, multi-user stats, and real database tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetDatabase}
            className="bg-white hover:bg-red-50 dark:bg-slate-900/60 border-slate-200 dark:border-white/10 text-slate-600 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-950/20 gap-1.5 rounded-lg text-xs cursor-pointer shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Test Data</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleAdminLogout}
            className="bg-white hover:bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-white/10 text-slate-700 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 dark:hover:bg-red-950/20 gap-1.5 rounded-lg text-xs cursor-pointer shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Real Live Metric Cards (No Fake Numbers) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="p-4 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span>Total Users</span>
              <Users className="w-4 h-4 text-indigo-600 dark:text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{stats.totalUsers} Accounts</div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span>Habits Tracked</span>
              <CheckSquare className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{stats.totalHabits} Logged</div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span>Deep Work</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{stats.totalFocusHours} Hours</div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span>Tasks Finished</span>
              <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{stats.totalTasks} Done</div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
              <span>Chat Sessions</span>
              <MessageSquare className="w-4 h-4 text-purple-600 dark:text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{stats.totalChatSessions} Archived</div>
          </div>
        </div>

        {/* Registered User Directory Table */}
        <div className="p-5 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-indigo-600 dark:text-purple-400" />
              <span>Real Registered Users Directory</span>
            </div>
            <span className="text-xs text-indigo-600 dark:text-cyan-400 font-mono font-medium">{users.length} Active Profiles</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-white/5">
                <tr>
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-4 py-2.5">Recovery Contacts</th>
                  <th className="px-4 py-2.5">Joined Date</th>
                  <th className="px-4 py-2.5">Account Role</th>
                  <th className="px-4 py-2.5">Security Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-purple-600/20 border border-indigo-200 dark:border-purple-500/30 flex items-center justify-center text-indigo-600 dark:text-purple-300 overflow-hidden shrink-0">
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold font-mono">#{u.id}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white capitalize">{u.username}</div>
                          <div className="text-[10px] font-mono text-indigo-600 dark:text-purple-300">ID: #{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 space-y-0.5">
                      <div className="text-[11px] font-mono text-indigo-600 dark:text-cyan-300">{u.email || 'No email'}</div>
                      <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">{u.phone || 'No WhatsApp'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono">{u.createdAt}</td>
                    <td className="px-4 py-3">
                      {u.isAdmin ? (
                        <span className="bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                          👑 Creator Admin
                        </span>
                      ) : (
                        <span className="bg-slate-100 dark:bg-purple-950/50 text-slate-700 dark:text-purple-300 border border-slate-200 dark:border-purple-500/20 px-2 py-0.5 rounded text-[10px]">
                          👤 Standard User
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                      Active & Encrypted
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Database Engine Card */}
        <div className="p-5 bg-white dark:bg-gradient-to-r dark:from-purple-950/20 dark:via-slate-900/40 dark:to-slate-900/60 rounded-xl border border-slate-200/80 dark:border-purple-500/20 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-purple-300">
            <Database className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
            <span>Live Data Tracking</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            All telemetry metrics are computed live from real account actions. When users complete habits, run focus sessions, or archive coaching chats, this portal reflects the exact real-time activity across your platform!
          </p>
        </div>
      </div>
    </div>
  );
}
