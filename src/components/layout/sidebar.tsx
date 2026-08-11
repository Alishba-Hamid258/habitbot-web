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
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="w-80 h-full flex flex-col glass-panel border-r border-white/10 bg-[#0b1120]/90 backdrop-blur-2xl z-20 overflow-hidden shrink-0"
          >
            {/* Header Brand */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between min-w-[320px]">
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

              <div className="flex items-center gap-1.5">
                {/* Guide Button Placed Right Beside HabitBot v5.0 Pro Suite */}
                <button
                  onClick={() => setShowGuideModal(true)}
                  className="px-2.5 py-1 bg-purple-950/70 hover:bg-purple-900/90 border border-purple-500/40 text-purple-300 hover:text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-purple-500/10"
                  title="Open HabitBot Quick User Guide & Tips"
                >
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Guide</span>
                </button>

                {currentUser.isAdmin && (
                  <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3 text-amber-400" /> Admin
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
                  className="p-1.5 hover:bg-slate-800/80 text-slate-400 hover:text-white rounded-lg transition-colors"
                  title="Close Sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Workspace Body */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 custom-scrollbar min-w-[320px]">
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
            className="fixed bottom-5 left-5 z-40 p-2.5 sm:p-3 rounded-2xl bg-slate-900/95 hover:bg-purple-950/90 border border-purple-500/40 text-purple-300 hover:text-white shadow-2xl shadow-purple-500/20 backdrop-blur-2xl flex items-center gap-2.5 transition-all group cursor-pointer"
            title="Open HabitBot Sidebar"
          >
            <div className="w-7 h-7 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 group-hover:bg-purple-600/50">
              <PanelLeftOpen className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-left pr-1">
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>Open Sidebar</span>
              </div>
              <div className="text-[10px] text-purple-300 font-mono">HabitBot v5.0</div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

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
                  className="h-8 text-xs bg-slate-900/80 border-white/10 text-purple-300 hover:text-white gap-1.5 rounded-lg"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Choose & Adjust Photo</span>
                </Button>
              </div>
              <div className="text-[10px] text-slate-400">Supports Zoom, Pan & Rotation adjustments</div>
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

      {/* Interactive Avatar Adjuster & Cropping Modal */}
      <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
        <DialogContent className="max-w-md bg-slate-950/95 border border-white/10 text-white rounded-2xl p-6 shadow-2xl backdrop-blur-2xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold gradient-text flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span>Adjust & Position Profile Photo</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Drag to reposition, zoom in/out, or rotate to fit your avatar perfectly.
            </DialogDescription>
          </DialogHeader>

          {/* Interactive Canvas Viewport */}
          <div className="flex flex-col items-center justify-center p-3 bg-slate-900/80 rounded-2xl border border-white/5">
            <div
              className="relative w-[260px] h-[260px] rounded-full overflow-hidden border-2 border-purple-500 shadow-2xl cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              title="Click and drag to reposition photo"
            >
              <canvas ref={previewCanvasRef} width={260} height={260} className="w-full h-full block" />
              <div className="absolute inset-0 border-2 border-dashed border-white/20 rounded-full pointer-events-none" />
            </div>

            <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
              <Move className="w-3 h-3 text-cyan-400" /> Drag with mouse to position photo
            </div>
          </div>

          {/* Controls: Zoom & Rotate & Pan Buttons */}
          <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-white/5 text-xs">
            {/* Zoom Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1 text-[11px]">
                  <ZoomIn className="w-3.5 h-3.5 text-purple-400" /> Zoom Level
                </span>
                <span className="font-mono text-cyan-300">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <ZoomOut className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <ZoomIn className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </div>
            </div>

            {/* Quick Alignment Directional Pad & Rotate */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-slate-400 mr-1">Position:</span>
                <button
                  onClick={() => setPanY((prev) => prev - 10)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                  title="Move Up"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPanY((prev) => prev + 10)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                  title="Move Down"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPanX((prev) => prev - 10)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                  title="Move Left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPanX((prev) => prev + 10)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
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
                className="h-7 text-xs bg-slate-800 border-white/10 text-slate-200 gap-1 rounded-lg"
              >
                <RotateCw className="w-3 h-3 text-cyan-400" />
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
              className="text-xs bg-slate-900 border-white/10 text-slate-300 rounded-lg"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApplyCroppedAvatar}
              className="gradient-button text-xs px-4 rounded-lg shadow-md shadow-purple-500/20 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply & Save Avatar</span>
            </Button>
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
      {/* Interactive HabitBot Inside User Guide Modal */}
      <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
        <DialogContent className="max-w-2xl bg-slate-950/95 border border-white/10 text-white rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-2xl max-h-[85vh] overflow-y-auto custom-scrollbar space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold gradient-text flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <span>HabitBot v5.0 — How to Use Your Workspace</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Master every tool in your high-performance behavioral dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-1.5 hover:border-purple-500/20 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-white/10">
                  <FileText className="w-4 h-4 text-cyan-400" />
                </div>
                <span>1. PDF & Document Habit Coach</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Click 📎 Paperclip to attach any PDF book, handout, or notes. HabitBot parses full multi-page chapters and extracts custom actionable drills.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-1.5 hover:border-purple-500/20 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-white/10">
                  <Bot className="w-4 h-4 text-purple-400" />
                </div>
                <span>2. Image OCR & Gemini Vision</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Attach quote posters, workout charts, or handwritten notes. In-browser OCR reads quotes instantly while Gemini Vision analyzes image layout.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-1.5 hover:border-purple-500/20 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-white/10">
                  <Headphones className="w-4 h-4 text-amber-400" />
                </div>
                <span>3. Ambient Media & Device Audio</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Listen to curated lofi presets (Lofi Nasheed & Heavy Rain), paste any YouTube link, or upload your own local audio/video files from your device.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-1.5 hover:border-purple-500/20 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-white/10">
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                </div>
                <span>4. Task Sprints & Swap Order</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Generate 4 micro-tasks with AI. Reorder tasks with ⬆️/⬇️ swap buttons, sort High-to-Low, and earn +5 XP per checkmark with fair uncheck balance.
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-1.5 hover:border-purple-500/20 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <span>5. Habit Matrix & Streak Freeze</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Check off daily habits in the sidebar (+10 XP). Toggle "Freeze Day" ❄️ during rest or travel days to shield your streak without penalties!
              </p>
            </div>

            <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-1.5 hover:border-purple-500/20 transition-colors">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <div className="p-1.5 rounded-lg bg-slate-950 border border-white/10">
                  <FileSpreadsheet className="w-4 h-4 text-pink-400" />
                </div>
                <span>6. Logbook & 5-Sheet Excel Audit</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Log daily wins & friction points (+15 XP) and export your full lifetime habits, tasks, media history, and streaks into an organized Excel (.xlsx) file!
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <Button
              size="sm"
              onClick={() => setShowGuideModal(false)}
              className="gradient-button text-xs px-5 py-2.5 rounded-lg shadow-md shadow-purple-500/20"
            >
              Got It, Let's Build Habits!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
