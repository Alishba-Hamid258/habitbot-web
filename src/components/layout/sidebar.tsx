'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bot, LogOut, Shield, User as UserIcon, Settings, Camera, Trash2, KeyRound, Mail, Phone, Check, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { XPBar } from '@/components/gamification/xp-bar';
import { PomodoroTimer } from '@/components/sidebar/pomodoro-timer';
import { HabitMatrix } from '@/components/sidebar/habit-matrix';
import { MediaPlayer } from '@/components/sidebar/media-player';
import { toast } from 'sonner';
import { getActiveUser, logoutActiveUser, computeUserStats, updateUserProfile, deleteUserAccount, StoredUser } from '@/lib/auth-storage';

export function Sidebar() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    id: number;
    username: string;
    email?: string;
    phone?: string;
    avatar?: string;
    isAdmin?: boolean;
  }>({
    id: 1,
    username: 'user',
  });
  const [totalXP, setTotalXP] = useState(0);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Profile edit states
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [previewAvatar, setPreviewAvatar] = useState<string | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshUserData = () => {
    const active = getActiveUser();
    if (active) {
      setCurrentUser(active);
      setEditEmail(active.email || '');
      setEditPhone(active.phone || '');
      setPreviewAvatar(active.avatar);
      const stats = computeUserStats(active.id);
      setTotalXP(stats.totalXP);
    }
  };

  useEffect(() => {
    refreshUserData();

    const handleUpdate = () => {
      refreshUserData();
    };

    window.addEventListener('habitbot_data_updated', handleUpdate);
    window.addEventListener('habitbot_user_profile_updated', handleUpdate);
    return () => {
      window.removeEventListener('habitbot_data_updated', handleUpdate);
      window.removeEventListener('habitbot_user_profile_updated', handleUpdate);
    };
  }, []);

  const handleLogout = () => {
    logoutActiveUser();
    toast.info('Logged out successfully.');
    router.push('/login');
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPreviewAvatar(base64);
      updateUserProfile(currentUser.id, { avatar: base64 });
      toast.success('Profile photo updated! 📸');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: { email?: string; phone?: string; password?: string } = {
      email: editEmail.trim() || undefined,
      phone: editPhone.trim() || undefined,
    };

    if (newPassword.trim()) {
      if (newPassword.length < 6) {
        toast.error('New password must be at least 6 characters.');
        return;
      }
      updates.password = newPassword.trim();
    }

    updateUserProfile(currentUser.id, updates);
    setNewPassword('');
    toast.success('Profile updated successfully!');
    setShowProfileModal(false);
  };

  const handleDeleteAccount = () => {
    if (currentUser.username.toLowerCase() === 'admin') {
      toast.error('The default master admin account cannot be deleted.');
      setShowDeleteConfirm(false);
      return;
    }

    const res = deleteUserAccount(currentUser.id);
    if (res.success) {
      toast.success('Your account and all associated habit data have been permanently deleted.');
      router.push('/login');
    } else {
      toast.error(res.error || 'Failed to delete account.');
    }
  };

  return (
    <>
      <aside className="w-80 h-full flex flex-col glass-panel border-r border-white/10 bg-[#0b1120]/90 backdrop-blur-2xl z-20">
        {/* Header Brand */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 p-0.5 flex items-center justify-center shadow-md shadow-purple-500/20">
              <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-400" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold gradient-text leading-tight">HabitBot</h2>
              <p className="text-[10px] text-slate-400 font-mono">v5.0 Pro Suite</p>
            </div>
          </div>

          {currentUser.isAdmin && (
            <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Shield className="w-3 h-3 text-amber-400" /> Admin
            </span>
          )}
        </div>

        {/* Scrollable Workspace Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar">
          {/* User Profile Card with Avatar & Settings */}
          <div className="p-3 bg-slate-900/60 rounded-xl border border-white/5 flex items-center justify-between group">
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2.5 text-left flex-1 min-w-0 hover:opacity-90 transition-opacity"
              title="Click to view & edit profile"
            >
              <div className="relative w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 overflow-hidden shrink-0">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.username} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white capitalize truncate flex items-center gap-1">
                  <span>{currentUser.username}</span>
                  <Settings className="w-3 h-3 text-slate-500 group-hover:text-purple-400 transition-colors" />
                </div>
                <div className="text-[10px] font-mono text-cyan-300">ID: #{currentUser.id}</div>
              </div>
            </button>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleLogout}
              className="h-7 text-xs text-slate-400 hover:text-red-400 hover:bg-red-950/20 px-2 gap-1 rounded-lg shrink-0 ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </Button>
          </div>

          {/* Live Dynamic Gamification XP Bar */}
          <XPBar totalXP={totalXP} />

          {/* Pomodoro Focus Timer */}
          <PomodoroTimer />

          {/* Daily Habit Matrix */}
          <HabitMatrix />

          {/* Focus Audio & Media Player */}
          <MediaPlayer />
        </div>
      </aside>

      {/* User Profile & Account Settings Dialog Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-md bg-slate-950/95 border border-white/10 text-white rounded-2xl p-6 shadow-2xl backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold gradient-text flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-purple-400" />
              <span>Account & Profile Settings</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Manage your profile photo, recovery details, and account security.
            </DialogDescription>
          </DialogHeader>

          {/* Avatar Upload Area */}
          <div className="flex items-center gap-4 py-2 border-b border-white/5">
            <div className="relative w-16 h-16 rounded-2xl bg-slate-900 border-2 border-purple-500/40 overflow-hidden shrink-0 shadow-lg">
              {previewAvatar ? (
                <img src={previewAvatar} alt="Profile preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-purple-400">
                  <UserIcon className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarUpload}
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs bg-slate-900/80 border-white/10 text-purple-300 hover:text-white gap-1.5 rounded-lg"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Upload Profile Photo</span>
              </Button>
              <div className="text-[10px] text-slate-400">PNG, JPG, WebP up to 5MB</div>
            </div>
          </div>

          {/* Profile Edit Form */}
          <form onSubmit={handleSaveProfile} className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">Username (Account ID: #{currentUser.id})</label>
              <Input
                type="text"
                disabled
                value={currentUser.username}
                className="bg-slate-900/40 border-white/5 text-slate-400 text-xs cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                <Mail className="w-3 h-3 text-cyan-400" /> Recovery Email
              </label>
              <Input
                type="email"
                placeholder="you@email.com"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="bg-slate-900/60 border-white/10 text-white text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-400" /> WhatsApp / Phone Number
              </label>
              <Input
                type="tel"
                placeholder="+1 234 567 890"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="bg-slate-900/60 border-white/10 text-white text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-purple-400" /> Change Password
              </label>
              <Input
                type="password"
                placeholder="Leave blank to keep current password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-slate-900/60 border-white/10 text-white text-xs"
              />
            </div>

            <Button
              type="submit"
              className="w-full gradient-button text-xs py-4 rounded-xl shadow-md shadow-purple-500/20"
            >
              Save Profile Changes
            </Button>
          </form>

          {/* Danger Zone: Delete Account */}
          <div className="pt-3 border-t border-white/10">
            <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Danger Zone
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="h-7 text-xs bg-red-600/80 hover:bg-red-600 gap-1 rounded-lg"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Account</span>
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Permanently delete your profile and erase all habits, focus sessions, and conversation archives.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm bg-slate-950/95 border border-red-500/30 text-white rounded-2xl p-6 shadow-2xl backdrop-blur-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              <span>Confirm Account Deletion</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 leading-relaxed pt-2">
              Are you sure you want to permanently delete account <b>"{currentUser.username}" (ID: #{currentUser.id})</b>?
              <br /><br />
              ⚠️ <b>This action is irreversible.</b> All your XP, habits, focus logs, and vault chats will be wiped immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="text-xs bg-slate-900 border-white/10 text-slate-300 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteAccount}
              className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md shadow-red-500/20"
            >
              Yes, Delete My Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
