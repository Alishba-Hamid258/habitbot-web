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
  Zap,
  Flame,
  Target,
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
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
            className="w-[300px] h-full flex flex-col bg-card border-r border-border z-20 overflow-hidden shrink-0 transition-colors"
          >
            {/* Header Brand */}
            <div className="p-3.5 border-b border-border flex items-center justify-between min-w-[300px]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground leading-tight">HabitBot</h2>
                  <p className="text-[10px] text-muted-foreground font-mono">Workspace</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Guide Button */}
                <button
                  onClick={() => setShowGuideModal(true)}
                  className="px-2.5 py-1 bg-muted hover:bg-secondary text-foreground border border-border rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  title="User Guide"
                >
                  <BookOpen className="w-3 h-3 text-primary" />
                  <span>Guide</span>
                </button>

                {currentUser.isAdmin && (
                  <span className="text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Shield className="w-3 h-3 text-amber-500" /> Admin
                  </span>
                )}

                {/* Close / Collapse Sidebar Button */}
                <button
                  onClick={() => {
                    setIsCollapsed(true);
                    localStorage.setItem('habitbot_sidebar_collapsed', 'true');
                    window.dispatchEvent(new Event('habitbot_sidebar_state_changed'));
                    toast.info('Sidebar collapsed');
                  }}
                  className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors cursor-pointer"
                  title="Close Sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Workspace Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar min-w-[300px]">
              {/* User Profile Card with Avatar & Settings */}
              <div className="p-2.5 bg-muted/40 rounded-lg border border-border/80 flex items-center justify-between group transition-colors">
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center gap-2.5 text-left flex-1 min-w-0 hover:opacity-90 transition-opacity cursor-pointer"
                  title="Edit profile"
                >
                  <div className="relative w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-foreground overflow-hidden shrink-0">
                    {currentUser.avatar ? (
                      <img src={currentUser.avatar} alt={currentUser.username} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-4 h-4 text-muted-foreground" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-foreground capitalize truncate flex items-center gap-1">
                      <span>{currentUser.username}</span>
                      <Settings className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground">ID: #{currentUser.id}</div>
                  </div>
                </button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleLogout}
                  className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 px-2 gap-1 rounded-md shrink-0 ml-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Logout</span>
                </Button>
              </div>

              {/* Live Dynamic Gamification XP Bar */}
              <XPBar totalXP={totalXP} />

              {/* Focus Timer */}
              <PomodoroTimer />

              {/* Daily Habits */}
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
            initial={{ opacity: 0, scale: 0.9, x: -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.9, x: -10 }}
            transition={{ duration: 0.15 }}
            onClick={() => {
              setIsCollapsed(false);
              localStorage.setItem('habitbot_sidebar_collapsed', 'false');
              window.dispatchEvent(new Event('habitbot_sidebar_state_changed'));
              toast.success('Sidebar opened');
            }}
            className="fixed bottom-4 left-4 z-40 px-3 py-2 rounded-lg bg-card hover:bg-muted border border-border text-foreground shadow-lg flex items-center gap-2 transition-colors cursor-pointer text-xs font-medium"
            title="Open Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4 text-primary" />
            <span>Open Sidebar</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* User Profile & Account Settings Dialog Modal */}
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground rounded-xl p-6 shadow-xl space-y-3">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-primary" />
              <span>Account & Profile</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Manage your profile photo, recovery contact details, and password.
            </DialogDescription>
          </DialogHeader>

          {/* Avatar Upload Area */}
          <div className="flex items-center gap-4 py-2 border-b border-border">
            <div className="relative w-14 h-14 rounded-full bg-muted border border-border overflow-hidden shrink-0">
              {previewAvatar ? (
                <img src={previewAvatar} alt="Profile preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <UserIcon className="w-6 h-6" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarFileSelect}
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-7 text-xs bg-card hover:bg-muted border-border text-foreground gap-1.5 rounded-md"
              >
                <Camera className="w-3 h-3" />
                <span>Change Photo</span>
              </Button>
              <div className="text-[10px] text-muted-foreground">Zoom, pan & rotate supported</div>
            </div>
          </div>

          {/* Profile Edit Form */}
          <form onSubmit={handleSaveProfile} className="space-y-2.5 pt-1">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground">Username (ID: #{currentUser.id})</label>
              <Input
                type="text"
                disabled
                value={currentUser.username}
                className="bg-muted border-border text-muted-foreground text-xs cursor-not-allowed rounded-md h-8"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground flex items-center gap-1">
                <Mail className="w-3 h-3 text-primary" /> Recovery Email
              </label>
              <Input
                type="email"
                placeholder="you@email.com"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="bg-background border-border text-foreground text-xs rounded-md h-8"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-600" /> WhatsApp / Phone Number
              </label>
              <Input
                type="tel"
                placeholder="+1 234 567 890"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="bg-background border-border text-foreground text-xs rounded-md h-8"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-foreground flex items-center gap-1">
                <KeyRound className="w-3 h-3 text-primary" /> Change Password
              </label>
              <Input
                type="password"
                placeholder="Leave blank to keep current password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-background border-border text-foreground text-xs rounded-md h-8"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8 rounded-md font-medium cursor-pointer"
            >
              Save Profile Changes
            </Button>
          </form>

          {/* Danger Zone: Delete Account */}
          <div className="pt-2 border-t border-border">
            <div className="p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Danger Zone
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="h-6 text-[11px] px-2 rounded-md cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Account</span>
                </Button>
              </div>
              <p className="text-[10px] text-red-600/90 dark:text-red-400/80 leading-tight">
                Permanently delete your profile, habits, focus logs, and archives.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Advanced Interactive Image Cropper & Adjuster Modal */}
      <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground rounded-xl p-6 shadow-xl space-y-3">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              <span>Adjust Profile Avatar</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Drag to pan, slider to zoom, and rotate for the circular avatar.
            </DialogDescription>
          </DialogHeader>

          {/* Canvas Drag Box */}
          <div className="flex justify-center py-2">
            <div
              className="relative w-48 h-48 rounded-full overflow-hidden border-2 border-primary shadow-sm bg-muted cursor-grab active:cursor-grabbing select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <canvas
                ref={previewCanvasRef}
                width={192}
                height={192}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Control Sliders & Buttons */}
          <div className="space-y-2.5 pt-1">
            {/* Zoom Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-foreground font-medium">
                <span className="flex items-center gap-1">
                  <ZoomIn className="w-3.5 h-3.5 text-primary" /> Zoom
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <ZoomOut className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="flex-1 accent-primary cursor-pointer h-1.5 bg-muted rounded-lg"
                />
                <ZoomIn className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>

            {/* Pan & Rotate Quick Controls */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPanY((prev) => prev - 10)}
                  className="p-1 bg-muted hover:bg-secondary rounded text-foreground cursor-pointer border border-border"
                  title="Move Up"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPanY((prev) => prev + 10)}
                  className="p-1 bg-muted hover:bg-secondary rounded text-foreground cursor-pointer border border-border"
                  title="Move Down"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPanX((prev) => prev - 10)}
                  className="p-1 bg-muted hover:bg-secondary rounded text-foreground cursor-pointer border border-border"
                  title="Move Left"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPanX((prev) => prev + 10)}
                  className="p-1 bg-muted hover:bg-secondary rounded text-foreground cursor-pointer border border-border"
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
                className="h-7 text-xs bg-card hover:bg-muted border-border text-foreground gap-1 rounded-md cursor-pointer"
              >
                <RotateCw className="w-3 h-3" />
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
              className="text-xs bg-card hover:bg-muted border-border text-foreground rounded-md cursor-pointer h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleApplyCroppedAvatar}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4 rounded-md h-8 flex items-center gap-1.5 cursor-pointer font-medium"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Avatar</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm bg-card border border-border text-foreground rounded-xl p-6 shadow-xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" />
              <span>Confirm Account Deletion</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              Are you sure you want to delete account <b>"{currentUser.username}"</b>? All your habits, focus logs, and chats will be removed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              className="text-xs bg-card hover:bg-muted border-border text-foreground rounded-md cursor-pointer h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDeleteAccount}
              className="text-xs rounded-md cursor-pointer h-8"
            >
              Delete Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Interactive HabitBot Inside User Guide Modal */}
      <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
        <DialogContent className="max-w-2xl bg-card border border-border text-foreground rounded-xl p-6 shadow-xl max-h-[85vh] overflow-y-auto custom-scrollbar space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>HabitBot Workspace User Guide</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Overview of features and tools in your dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-muted/40 rounded-lg border border-border/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>⚡ Experience Points (XP) & Levels</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Earn <b>+10 XP</b> per habit checked, <b>+50 XP</b> for a Perfect Day (all core habits complete), and <b>+5 XP</b> per task sprint. Unchecking items deducts XP accordingly. Every 100 XP unlocks a new mastery rank.
              </p>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>🔥 Streaks, Grace & Freeze Shield</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Streaks track continuous daily execution. If no habit is checked yet today, your streak enters the <b>Grace Period (At Risk)</b> until midnight. Activate <b>Freeze Day ❄️</b> to shield your streak during rest or travel.
              </p>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                <span>🎯 Discipline Score (0% – 100%)</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                A rolling 7-day weighted score blending <b>60% Daily Habits</b> and <b>40% Task Sprints</b>. Missing days without freeze or unchecking items drops your discipline score; daily execution steadily restores it.
              </p>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>📄 Document & PDF Coach</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Attach PDFs or text notes via the paperclip icon in the Coach tab. The AI parses the contents and translates them into daily actionable micro-routines.
              </p>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Bot className="w-3.5 h-3.5 text-purple-500" />
                <span>👁️ Image OCR & Vision</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Attach images or quotes. In-browser OCR extracts text directly, and Gemini Vision reads diagrams and schedules.
              </p>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <Headphones className="w-3.5 h-3.5 text-amber-500" />
                <span>🎧 Focus Audio & Pomodoro</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pair 25-minute Pomodoro focus intervals with ambient audio streams (Lofi Nasheed, Heavy Rain), YouTube URLs, or local device audio.
              </p>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                <span>📋 Action Sprints & Priority Order</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Break large goals into 4 micro-tasks with AI. Reorder tasks with ⬆️/⬇️ swap buttons and filter by priority.
              </p>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border border-border/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <FileSpreadsheet className="w-3.5 h-3.5 text-pink-500" />
                <span>📊 Logbook & Multi-Sheet Excel Export</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Record evening reflections and export your entire lifetime habit, task, and focus history as an organized Excel spreadsheet (.xlsx).
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end pt-1">
            <Button
              size="sm"
              onClick={() => setShowGuideModal(false)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-4 h-8 rounded-md font-medium cursor-pointer"
            >
              Close Guide
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
