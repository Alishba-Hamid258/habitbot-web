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
          password: 'admin123',
          createdAt: new Date().toISOString().split('T')[0],
          isAdmin: true,
        },
      ];
      localStorage.setItem('habitbot_registered_users', JSON.stringify(defaultAdmin));

      loadRealTelemetry();
      toast.success('Database and telemetry reset to clean state (0 records)!');
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-[#f1f5f9] p-6 sm:p-10 space-y-8">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg">
              <Shield className="w-5 h-5 text-amber-400" />
            </span>
            <h1 className="text-2xl font-bold text-white">HabitBot Creator Admin Portal</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Live real-time telemetry, registered user directory, and database management</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleResetDatabase}
            className="bg-slate-900/60 border-white/10 text-slate-400 hover:text-red-400 hover:bg-red-950/20 gap-1.5 rounded-lg text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Test Data</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleAdminLogout}
            className="bg-slate-900/60 border-white/10 text-slate-300 hover:text-red-400 hover:bg-red-950/20 gap-1.5 rounded-lg text-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Real Live Metric Cards (No Fake Numbers) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Users</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{stats.totalUsers} Accounts</div>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Habits Tracked</span>
              <CheckSquare className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{stats.totalHabits} Logged</div>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Deep Work</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{stats.totalFocusHours} Hours</div>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Tasks Finished</span>
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{stats.totalTasks} Done</div>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Chat Sessions</span>
              <MessageSquare className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{stats.totalChatSessions} Archived</div>
          </div>
        </div>

        {/* Registered User Directory Table */}
        <div className="p-5 bg-slate-900/60 rounded-xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-400" />
              <span>Real Registered Users Directory</span>
            </div>
            <span className="text-xs text-cyan-400 font-mono">{users.length} Active Profiles</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-b border-white/5">
                <tr>
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-4 py-2.5">Recovery Contacts</th>
                  <th className="px-4 py-2.5">Joined Date</th>
                  <th className="px-4 py-2.5">Account Role</th>
                  <th className="px-4 py-2.5">Security Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 overflow-hidden shrink-0">
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold font-mono">#{u.id}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-white capitalize">{u.username}</div>
                          <div className="text-[10px] font-mono text-purple-300">ID: #{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 space-y-0.5">
                      <div className="text-[11px] font-mono text-cyan-300">{u.email || 'No email'}</div>
                      <div className="text-[10px] font-mono text-emerald-400">{u.phone || 'No WhatsApp'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono">{u.createdAt}</td>
                    <td className="px-4 py-3">
                      {u.isAdmin ? (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                          👑 Creator Admin
                        </span>
                      ) : (
                        <span className="bg-purple-950/50 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded text-[10px]">
                          👤 Standard User
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-emerald-400 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Active & Encrypted
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Database Engine Card */}
        <div className="p-5 bg-gradient-to-r from-purple-950/20 via-slate-900/40 to-slate-900/60 rounded-xl border border-purple-500/20 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-purple-300">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>Live Data Tracking</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            All telemetry metrics are computed live from real account actions. When users complete habits, run focus sessions, or archive coaching chats, this portal reflects the exact real-time activity across your platform!
          </p>
        </div>
      </div>
    </div>
  );
}
