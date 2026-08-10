'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Users, CheckSquare, Clock, MessageSquare, LogOut, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AdminUser {
  id: number;
  username: string;
  joinedDate: string;
  habitsChecked: number;
  focusMins: number;
}

const MOCK_USERS: AdminUser[] = [
  { id: 1, username: 'admin', joinedDate: '2026-08-01', habitsChecked: 142, focusMins: 480 },
  { id: 2, username: 'zara', joinedDate: '2026-08-04', habitsChecked: 89, focusMins: 320 },
  { id: 3, username: 'alex_dev', joinedDate: '2026-08-07', habitsChecked: 45, focusMins: 180 },
];

export default function AdminPage() {
  const router = useRouter();

  const handleAdminLogout = () => {
    localStorage.removeItem('habitbot_user');
    toast.info('Logged out from Creator Portal.');
    router.push('/login');
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
          <p className="text-xs text-slate-400 mt-1">Platform-wide telemetry, user directory, and database management</p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleAdminLogout}
          className="bg-slate-900/60 border-white/10 text-slate-300 hover:text-red-400 hover:bg-red-950/20 gap-1.5 rounded-lg"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </Button>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total Users</span>
              <Users className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">3 Registered</div>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Habits Tracked</span>
              <CheckSquare className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">276 Logged</div>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Deep Work</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">16.3 Hours</div>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Tasks Finished</span>
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">58 Done</div>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Chat Sessions</span>
              <MessageSquare className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">19 Archived</div>
          </div>
        </div>

        {/* User Directory Table */}
        <div className="p-5 bg-slate-900/60 rounded-xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Registered Users Directory</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">3 Accounts Total</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-b border-white/5">
                <tr>
                  <th className="px-4 py-2.5">User ID</th>
                  <th className="px-4 py-2.5">Username</th>
                  <th className="px-4 py-2.5">Joined Date</th>
                  <th className="px-4 py-2.5">Habits Completed</th>
                  <th className="px-4 py-2.5">Focus Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {MOCK_USERS.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-purple-300">#{u.id}</td>
                    <td className="px-4 py-3 font-semibold text-white">{u.username}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono">{u.joinedDate}</td>
                    <td className="px-4 py-3 text-cyan-300 font-mono">{u.habitsChecked} 🛡️</td>
                    <td className="px-4 py-3 text-amber-300 font-mono">{u.focusMins} mins 🍅</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cloud Database Integration Guide */}
        <div className="p-5 bg-gradient-to-r from-purple-950/20 via-slate-900/40 to-slate-900/60 rounded-xl border border-purple-500/20 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-purple-300">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>Cloud Database Engine: Supabase (PostgreSQL)</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Your Next.js app is pre-configured to connect to free permanent cloud PostgreSQL on <b>Supabase</b>. Once you paste your Supabase URL & Anon Key into <code>.env.local</code> and Vercel environment variables, your platform will scale automatically to thousands of users with real-time replication!
          </p>
        </div>
      </div>
    </div>
  );
}
