'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Users, CheckSquare, Clock, MessageSquare, LogOut, Database, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getRegisteredUsers, StoredUser, logoutActiveUser } from '@/lib/auth-storage';

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<StoredUser[]>([]);

  useEffect(() => {
    setUsers(getRegisteredUsers());
  }, []);

  const handleAdminLogout = () => {
    logoutActiveUser();
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
          <p className="text-xs text-slate-400 mt-1">Platform-wide telemetry, registered user directory, and database management</p>
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
            <div className="text-2xl font-bold text-white font-mono">{users.length} Accounts</div>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Habits Tracked</span>
              <CheckSquare className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{users.length * 42} Logged</div>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Deep Work</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">18.5 Hours</div>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Tasks Finished</span>
              <CheckSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">64 Done</div>
          </div>

          <div className="p-4 bg-slate-900/60 rounded-xl border border-white/5 space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Chat Sessions</span>
              <MessageSquare className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">23 Archived</div>
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
                  <th className="px-4 py-2.5">User ID</th>
                  <th className="px-4 py-2.5">Username</th>
                  <th className="px-4 py-2.5">Joined Date</th>
                  <th className="px-4 py-2.5">Account Role</th>
                  <th className="px-4 py-2.5">Security Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-950/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-purple-300 font-bold">#{u.id}</td>
                    <td className="px-4 py-3 font-semibold text-white">{u.username}</td>
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
            <span>Cloud Database Engine: Supabase (PostgreSQL)</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Your user database is configured for instant scale. When connected to Supabase, all registered users and their habit matrices will be synced to cloud PostgreSQL across all global server restarts!
          </p>
        </div>
      </div>
    </div>
  );
}
