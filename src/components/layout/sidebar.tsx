'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  LogOut,
  Shield,
  User as UserIcon,
  Settings,
  Camera,
  Trash2,
  KeyRound,
  Mail,
  Phone,
  Check,
  AlertTriangle,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Move,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Headphones,
  CheckSquare,
  FileSpreadsheet,
  FileText,
  Upload,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { XPBar } from '@/components/gamification/xp-bar';
import { PomodoroTimer } from '@/components/sidebar/pomodoro-timer';
import { HabitMatrix } from '@/components/sidebar/habit-matrix';
import { MediaPlayer } from '@/components/sidebar/media-player';
import { toast } from 'sonner';
import {
  getActiveUser,
  logoutActiveUser,
  computeUserStats,
  updateUserProfile,
  deleteUserAccount,
} from '@/lib/auth-storage';

export function Sidebar() {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
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
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Profile edit states
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [previewAvatar, setPreviewAvatar] = useState<string | undefined>(undefined);

  // Image Adjuster / Cropper States
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

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

    // Check saved collapsed state
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('habitbot_sidebar_collapsed');
      if (saved === 'true') {
        setIsCollapsed(true);
      }
    }

    const handleUpdate = () => {
      refreshUserData();
    };

    const handleOpenSidebar = () => {
      setIsCollapsed(false);
      localStorage.setItem('habitbot_sidebar_collapsed', 'false');
      window.dispatchEvent(new Event('habitbot_sidebar_state_changed'));
    };

    const handleToggleSidebar = () => {
      setIsCollapsed((prev) => {
        const next = !prev;
        localStorage.setItem('habitbot_sidebar_collapsed', String(next));
        window.dispatchEvent(new Event('habitbot_sidebar_state_changed'));
        return next;
      });
    };

    window.addEventListener('habitbot_data_updated', handleUpdate);
    window.addEventListener('habitbot_user_profile_updated', handleUpdate);
    window.addEventListener('habitbot_open_sidebar', handleOpenSidebar);
    window.addEventListener('habitbot_toggle_sidebar', handleToggleSidebar);

    return () => {
      window.removeEventListener('habitbot_data_updated', handleUpdate);
      window.removeEventListener('habitbot_user_profile_updated', handleUpdate);
      window.removeEventListener('habitbot_open_sidebar', handleOpenSidebar);
      window.removeEventListener('habitbot_toggle_sidebar', handleToggleSidebar);
    };
  }, []);

  // When a file is chosen, open the adjuster modal
  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      setRawImageSrc(src);
      setZoom(1);
      setPanX(0);
      setPanY(0);
      setRotation(0);

      const img = new Image();
      img.src = src;
      img.onload = () => {
        imageElementRef.current = img;
        setShowAdjustModal(true);
      };
    };
    reader.readAsDataURL(file);
    // Reset file input so user can pick same file again if desired
    e.target.value = '';
  };

  // Draw adjusted photo on live canvas
  useEffect(() => {
    if (!showAdjustModal || !imageElementRef.current || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 260;
    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);

    // Background circle clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Fill dark background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    // Apply adjustments: translate, rotate, scale
    ctx.translate(size / 2 + panX, size / 2 + panY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    const img = imageElementRef.current;
    const aspect = img.width / img.height;
    let drawW = size;
    let drawH = size;

    if (aspect > 1) {
      drawW = size * aspect;
    } else {
      drawH = size / aspect;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }, [showAdjustModal, zoom, panX, panY, rotation]);

  // Drag handlers for panning photo
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Apply and save adjusted photo
  const handleApplyCroppedAvatar = () => {
    if (!imageElementRef.current) return;

    // Render crisp 256x256 export
    const exportCanvas = document.createElement('canvas');
    const size = 256;
    exportCanvas.width = size;
    exportCanvas.height = size;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, size, size);

    // Map 260 preview size to 256 export
    const scaleFactor = 256 / 260;
    ctx.translate(size / 2 + panX * scaleFactor, size / 2 + panY * scaleFactor);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    const img = imageElementRef.current;
    const aspect = img.width / img.height;
    let drawW = size;
    let drawH = size;
    if (aspect > 1) {
      drawW = size * aspect;
    } else {
      drawH = size / aspect;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    const croppedBase64 = exportCanvas.toDataURL('image/png', 0.92);
    setPreviewAvatar(croppedBase64);
    updateUserProfile(currentUser.id, { avatar: croppedBase64 });
    setShowAdjustModal(false);
    toast.success('Adjusted profile photo saved! 📸');
  };

  const handleLogout = () => {
    logoutActiveUser();
    toast.info('Logged out successfully.');
    router.push('/login');
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
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.aside
            key="habitbot-sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="w-80 h-full flex flex-col bg-white dark:bg-[#1e1e1e] border-r border-[#dadce0] dark:border-[#3c4043] z-20 overflow-hidden shrink-0 transition-colors"
          >
            {/* Header Brand */}
            <div className="p-4 border-b border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between min-w-[320px]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#1a73e8] flex items-center justify-center text-white shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#202124] dark:text-[#e8eaed] leading-tight">HabitBot</h2>
                  <p className="text-[10px] text-[#5f6368] dark:text-[#9aa0a6] font-mono">Workspace</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Guide Button Placed Right Beside HabitBot */}
                <button
                  onClick={() => setShowGuideModal(true)}
                  className="px-3 py-1 bg-[#e8f0fe] hover:bg-[#d2e3fc] dark:bg-[#394457] dark:hover:bg-[#475569] text-[#1a73e8] dark:text-[#8ab4f8] rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Open HabitBot Quick User Guide & Tips"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Guide</span>
                </button>

                {currentUser.isAdmin && (
                  <span className="text-[10px] font-medium bg-[#fef7e0] text-[#b06000] dark:bg-[#3c3010] dark:text-[#fdd663] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3 text-[#f9ab00]" /> Admin
                  </span>
                )}

                {/* Close / Collapse Sidebar Button */}
                <button
                  onClick={() => {
                    setIsCollapsed(true);
                    localStorage.setItem('habitbot_sidebar_collapsed', 'true');
                    window.dispatchEvent(new Event('habitbot_sidebar_state_changed'));
                    toast.info('Sidebar closed (Click "Open Sidebar" to re-open anytime)');
                  }}
                  className="p-1.5 hover:bg-[#f1f3f4] dark:hover:bg-[#2d2e30] text-[#5f6368] hover:text-[#202124] dark:text-[#9aa0a6] dark:hover:text-[#e8eaed] rounded-full transition-colors cursor-pointer"
                  title="Close Sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Workspace Body */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar min-w-[320px]">
              {/* User Profile Card with Avatar & Settings */}
              <div className="p-3 bg-[#f8f9fa] dark:bg-[#2d2e30] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] flex items-center justify-between group transition-colors">
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center gap-2.5 text-left flex-1 min-w-0 hover:opacity-90 transition-opacity cursor-pointer"
                  title="Click to view & edit profile"
                >
                  <div className="relative w-8 h-8 rounded-full bg-[#e8f0fe] dark:bg-[#394457] border border-[#dadce0] dark:border-[#3c4043] flex items-center justify-center text-[#1a73e8] dark:text-[#8ab4f8] overflow-hidden shrink-0">
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
                    <div className="text-xs font-medium text-[#202124] dark:text-[#e8eaed] capitalize truncate flex items-center gap-1">
                      <span>{currentUser.username}</span>
                      <Settings className="w-3 h-3 text-[#5f6368] group-hover:text-[#1a73e8] dark:group-hover:text-[#8ab4f8] transition-colors" />
                    </div>
                    <div className="text-[10px] font-mono text-[#5f6368] dark:text-[#9aa0a6]">ID: #{currentUser.id}</div>
                  </div>
                </button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleLogout}
                  className="h-7 text-xs text-[#5f6368] hover:text-[#d93025] hover:bg-[#fce8e6] dark:text-[#9aa0a6] dark:hover:text-[#f28b82] dark:hover:bg-[#3c2020] px-2 gap-1 rounded-full shrink-0 ml-1 cursor-pointer"
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
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Floating Open Sidebar Button when Collapsed */}
      <AnimatePresence>
        {isCollapsed && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -10 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              setIsCollapsed(false);
              localStorage.setItem('habitbot_sidebar_collapsed', 'false');
              window.dispatchEvent(new Event('habitbot_sidebar_state_changed'));
              toast.success('Sidebar opened! 🚀');
            }}
            className="fixed bottom-5 left-5 z-40 p-2.5 sm:p-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 hover:bg-slate-100 dark:hover:bg-purple-950/90 border border-slate-300 dark:border-purple-500/40 text-slate-800 dark:text-purple-300 shadow-2xl backdrop-blur-2xl flex items-center gap-2.5 transition-all group cursor-pointer"
            title="Open HabitBot Sidebar"
          >
            <div className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-purple-600/30 border border-slate-200 dark:border-purple-500/40 flex items-center justify-center text-slate-700 dark:text-purple-300">
              <PanelLeftOpen className="w-4 h-4 text-indigo-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-left pr-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                <span>Open Sidebar</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-purple-300 font-mono">HabitBot v5.0</div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* User Profile & Account Settings Dialog Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-950/95 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl p-6 shadow-2xl backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:gradient-text flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-indigo-600 dark:text-purple-400" />
              <span>Account & Profile Settings</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Manage your profile photo, recovery details, and account security.
            </DialogDescription>
          </DialogHeader>

          {/* Avatar Upload Area */}
          <div className="flex items-center gap-4 py-2 border-b border-slate-100 dark:border-white/5">
            <div className="relative w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-900 border-2 border-indigo-200 dark:border-purple-500/40 overflow-hidden shrink-0 shadow-sm">
              {previewAvatar ? (
                <img src={previewAvatar} alt="Profile preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-indigo-600 dark:text-purple-400">
                  <UserIcon className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarFileSelect}
                accept="image/*"
                className="hidden"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/80 border-slate-200 dark:border-white/10 text-slate-700 dark:text-purple-300 hover:text-slate-900 dark:hover:text-white gap-1.5 rounded-lg shadow-sm"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Choose & Adjust Photo</span>
                </Button>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Supports Zoom, Pan & Rotation adjustments</div>
            </div>
          </div>

          {/* Profile Edit Form */}
          <form onSubmit={handleSaveProfile} className="space-y-3 pt-2">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Username (Account ID: #{currentUser.id})</label>
              <Input
                type="text"
                disabled
                value={currentUser.username}
                className="bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 text-xs cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Mail className="w-3 h-3 text-indigo-600 dark:text-cyan-400" /> Recovery Email
              </label>
              <Input
                type="email"
                placeholder="you@email.com"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="bg-white dark:bg-slate-900/60 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs shadow-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> WhatsApp / Phone Number
              </label>
              <Input
                type="tel"
                placeholder="+1 234 567 890"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="bg-white dark:bg-slate-900/60 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs shadow-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-indigo-600 dark:text-purple-400" /> Change Password
              </label>
              <Input
                type="password"
                placeholder="Leave blank to keep current password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-white dark:bg-slate-900/60 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs shadow-sm"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:gradient-button text-xs py-4 rounded-xl shadow-md cursor-pointer"
            >
              Save Profile Changes
            </Button>
          </form>

          {/* Danger Zone: Delete Account */}
          <div className="pt-3 border-t border-slate-200 dark:border-white/10">
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-500/20 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Danger Zone
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white gap-1 rounded-lg cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Account</span>
                </Button>
              </div>
              <p className="text-[10px] text-red-600/90 dark:text-slate-400 leading-tight">
                Permanently delete your profile and erase all habits, focus sessions, and conversation archives.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Advanced Interactive Image Cropper & Adjuster Modal */}
      <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-950/95 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl p-6 shadow-2xl backdrop-blur-2xl space-y-3">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:gradient-text flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-purple-400" />
              <span>Adjust Profile Avatar</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Drag to pan, slider to zoom, and rotate for the perfect circular avatar fit.
            </DialogDescription>
          </DialogHeader>

          {/* Canvas Drag Box */}
          <div className="flex justify-center py-2">
            <div
              className="relative w-52 h-52 rounded-full overflow-hidden border-4 border-indigo-500/40 shadow-xl bg-slate-100 dark:bg-slate-900 cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <canvas
                ref={previewCanvasRef}
                width={208}
                height={208}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 pointer-events-none border border-white/20 rounded-full" />
            </div>
          </div>

          {/* Control Sliders & Buttons */}
          <div className="space-y-3 pt-1">
            {/* Zoom Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1 font-medium">
                  <ZoomIn className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" /> Zoom Level
                </span>
                <span className="font-mono text-[10px] text-indigo-600 dark:text-cyan-400">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <ZoomOut className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-indigo-600 dark:accent-purple-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg"
                />
                <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* Pan & Rotate Quick Controls */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPanY((prev) => prev - 10)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
                  title="Move Up"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPanY((prev) => prev + 10)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
                  title="Move Down"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPanX((prev) => prev - 10)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
                  title="Move Left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPanX((prev) => prev + 10)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-300 cursor-pointer"
                  title="Move Right"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                className="h-7 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 gap-1 rounded-lg cursor-pointer"
              >
                <RotateCw className="w-3 h-3 text-indigo-600 dark:text-cyan-400" />
                <span>Rotate</span>
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAdjustModal(false)}
              className="text-xs bg-white hover:bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApplyCroppedAvatar}
              className="bg-slate-900 hover:bg-slate-800 text-white dark:gradient-button text-xs px-4 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply & Save Avatar</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm bg-white dark:bg-slate-950/95 border border-red-200 dark:border-red-500/30 text-slate-900 dark:text-white rounded-2xl p-6 shadow-2xl backdrop-blur-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span>Confirm Account Deletion</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-2">
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
              className="text-xs bg-white hover:bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteAccount}
              className="text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm cursor-pointer"
            >
              Yes, Delete My Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Interactive HabitBot Inside User Guide Modal */}
      <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-950/95 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-2xl max-h-[85vh] overflow-y-auto custom-scrollbar space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:gradient-text flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-purple-400" />
              <span>HabitBot v5.0 — How to Use Your Workspace</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Master every tool in your high-performance behavioral dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-1.5 hover:border-slate-300 dark:hover:border-purple-500/20 transition-colors shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-slate-950 border border-indigo-200 dark:border-white/10">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
                </div>
                <span>1. PDF & Document Habit Coach</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Click 📎 Paperclip to attach any PDF book, handout, or notes. HabitBot parses full multi-page chapters and extracts custom actionable drills.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-1.5 hover:border-slate-300 dark:hover:border-purple-500/20 transition-colors shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-slate-950 border border-purple-200 dark:border-white/10">
                  <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span>2. Image OCR & Gemini Vision</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Attach quote posters, workout charts, or handwritten notes. In-browser OCR reads quotes instantly while Gemini Vision analyzes image layout.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-1.5 hover:border-slate-300 dark:hover:border-purple-500/20 transition-colors shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-slate-950 border border-amber-200 dark:border-white/10">
                  <Headphones className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span>3. Ambient Media & Device Audio</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Listen to curated lofi presets (Lofi Nasheed & Heavy Rain), paste any YouTube link, or upload your own local audio/video files from your device.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-1.5 hover:border-slate-300 dark:hover:border-purple-500/20 transition-colors shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-slate-950 border border-blue-200 dark:border-white/10">
                  <CheckSquare className="w-4 h-4 text-blue-600 dark:text-indigo-400" />
                </div>
                <span>4. Task Sprints & Swap Order</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Generate 4 micro-tasks with AI. Reorder tasks with ⬆️/⬇️ swap buttons, sort High-to-Low, and earn +5 XP per checkmark with fair uncheck balance.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-1.5 hover:border-slate-300 dark:hover:border-purple-500/20 transition-colors shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-slate-950 border border-emerald-200 dark:border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span>5. Habit Matrix & Streak Freeze</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Check off daily habits in the sidebar (+10 XP). Toggle "Freeze Day" ❄️ during rest or travel days to shield your streak without penalties!
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-1.5 hover:border-slate-300 dark:hover:border-purple-500/20 transition-colors shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <div className="p-1.5 rounded-lg bg-pink-50 dark:bg-slate-950 border border-pink-200 dark:border-white/10">
                  <FileSpreadsheet className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                </div>
                <span>6. Logbook & 5-Sheet Excel Audit</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Log daily wins & friction points (+15 XP) and export your full lifetime habits, tasks, media history, and streaks into an organized Excel (.xlsx) file!
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              size="sm"
              onClick={() => setShowGuideModal(false)}
              className="bg-slate-900 hover:bg-slate-800 text-white dark:gradient-button text-xs px-5 py-2.5 rounded-lg shadow-sm cursor-pointer"
            >
              Got It, Let's Build Habits!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
