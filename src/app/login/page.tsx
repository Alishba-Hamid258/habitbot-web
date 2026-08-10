'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Bot,
  Lock,
  User,
  Shield,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Mail,
  Phone,
  RefreshCw,
  ArrowLeft,
  Send,
  MessageCircle,
  AlertCircle,
  Copy,
  Check,
  BookOpen,
  HelpCircle,
  ChevronRight,
  Headphones,
  CheckSquare,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { registerUser, authenticateUser, sendPasswordResetOTP, verifyOTPAndResetPassword } from '@/lib/auth-storage';

type TabType = 'login' | 'signup' | 'admin' | 'forgot';

const GUIDE_SECTIONS = [
  {
    title: '1. Account Registration & User IDs',
    icon: User,
    color: 'text-purple-400',
    desc: 'Each new member is assigned a strictly sequential User ID (#1 Admin, #2, #3...). All habits, focus logs, and archives are isolated to your account with zero cross-account data bleed.',
  },
  {
    title: '2. Dual AI Coaching Engine',
    icon: Bot,
    color: 'text-cyan-400',
    desc: 'Toggle between Groq (instant ultra-fast text responses) and Google Gemini (Vision Multimodal for analyzing routine schedules, workout photos, and desk setups).',
  },
  {
    title: '3. Daily Habit Matrix & Streak Freeze',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    desc: 'Track daily habits to earn +10 XP per completion and +50 XP for perfect days. Going on vacation or feeling sick? Turn on "Freeze Streak" to safeguard your streak without penalty!',
  },
  {
    title: '4. Deep Work Pomodoro & Audio Player',
    icon: Headphones,
    color: 'text-amber-400',
    desc: 'Run 25-minute focus intervals with sound cues. Paste any YouTube study stream or select curated Lofi/Rain presets to play continuously in the background across all tabs.',
  },
  {
    title: '5. AI Task Architect & Master DB',
    icon: CheckSquare,
    color: 'text-indigo-400',
    desc: 'Enter any big goal and let the AI break it into 4 micro-steps. All created and completed tasks are permanently preserved in your Master Task Database, even if cleared from daily sprint.',
  },
  {
    title: '6. Multi-Year Excel Life Audit',
    icon: FileSpreadsheet,
    color: 'text-pink-400',
    desc: 'Export your daily progress, weekly sprints, or lifetime archives into structured 6-sheet Excel spreadsheets with 1 click.',
  },
  {
    title: '7. WhatsApp & Email Password Recovery',
    icon: Shield,
    color: 'text-yellow-400',
    desc: 'For top-tier security, passwords can only be reset by verified 6-digit OTP codes sent to your registered WhatsApp number or recovery Email address.',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [loading, setLoading] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // 2-Step OTP Forgot Password States
  const [recoveryContact, setRecoveryContact] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtpInfo, setGeneratedOtpInfo] = useState<{ otp: string; contact: string; isPhone: boolean; username: string } | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [copiedOtp, setCopiedOtp] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Please enter your username/email and password.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const res = authenticateUser(username, password);
      if (!res.success) {
        toast.error(res.error || 'Invalid credentials.');
        return;
      }

      toast.success(`Welcome back, ${res.user?.username}! (ID: #${res.user?.id}) 🚀`);
      router.push('/dashboard');
    }, 500);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
      toast.error('Please fill in all required registration fields.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid recovery email address.');
      return;
    }
    if (!phone.trim()) {
      toast.error('Please enter your WhatsApp / phone number for security recovery.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match! Please verify your password.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const res = registerUser(username, password, email, phone);
      if (!res.success) {
        toast.error(res.error || 'Registration failed.');
        return;
      }

      setPassword('');
      setConfirmPassword('');
      setActiveTab('login');
      toast.success(`🎉 Account created for "${res.user?.username}" (Assigned User ID: #${res.user?.id})! Please sign in now.`);
    }, 600);
  };

  // Step 1: Request OTP code via Email or WhatsApp (Username not allowed)
  const handleRequestOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryContact.trim()) {
      toast.error('Please enter your registered Email or WhatsApp number.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const res = sendPasswordResetOTP(recoveryContact);
      if (!res.success) {
        toast.error(res.error || 'Could not send verification code.');
        return;
      }

      const isPhone = !recoveryContact.includes('@');
      setGeneratedOtpInfo({
        otp: res.otp!,
        contact: recoveryContact,
        isPhone,
        username: res.username!,
      });
      setOtpSent(true);
      toast.success(`📲 6-Digit OTP sent to ${isPhone ? 'WhatsApp' : 'Email'}! Code: ${res.otp}`, {
        duration: 8000,
      });
    }, 600);
  };

  // Step 2: Verify OTP and update password
  const handleVerifyOTPAndReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredOtp.trim() || !newPassword.trim() || !confirmNewPassword.trim()) {
      toast.error('Please fill in the 6-digit OTP and new password.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match!');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const res = verifyOTPAndResetPassword(recoveryContact, enteredOtp, newPassword);
      if (!res.success) {
        toast.error(res.error || 'OTP verification failed.');
        return;
      }

      toast.success(`🔒 Password successfully updated for "${res.username}"! Please sign in now.`);
      setUsername(res.username || '');
      setPassword('');
      setRecoveryContact('');
      setOtpSent(false);
      setGeneratedOtpInfo(null);
      setEnteredOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
      setActiveTab('login');
    }, 600);
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().toLowerCase() === 'admin' && password === 'admin123') {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        authenticateUser('admin', 'admin123');
        toast.success('👑 Welcome Creator! Admin Portal Unlocked.');
        router.push('/admin');
      }, 500);
    } else {
      toast.error('Invalid Creator Admin credentials. (Default: admin / admin123)');
    }
  };

  const copyOTP = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedOtp(true);
    toast.success('OTP code copied!');
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 py-8 overflow-x-hidden bg-[#090d16]">
      {/* Background Animated Blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-4">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-purple-500/20 mb-2"
          >
            <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
              <Bot className="w-8 h-8 text-purple-400" />
            </div>
          </motion.div>
          <h1 className="text-3xl font-extrabold tracking-tight gradient-text">
            HabitBot v5.0
          </h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> AI Behavioral & Performance Coach
          </p>

          {/* User Guide Trigger Button */}
          <button
            onClick={() => setShowGuideModal(true)}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-purple-950/60 border border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-900/50 transition-all shadow-md"
          >
            <BookOpen className="w-3 h-3 text-cyan-400" />
            <span>New to HabitBot? Read User Guide & Tips</span>
            <ChevronRight className="w-3 h-3 text-purple-400" />
          </button>
        </div>

        <Card className="glass-panel border border-white/10 shadow-2xl backdrop-blur-2xl">
          {/* Custom Animated Tabs Bar */}
          {activeTab !== 'forgot' ? (
            <div className="grid grid-cols-3 p-1.5 m-4 bg-slate-900/80 rounded-xl border border-white/5 relative">
              <button
                onClick={() => setActiveTab('login')}
                className={`relative z-10 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'login' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5" /> Login
                {activeTab === 'login' && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg -z-10 shadow-md shadow-purple-500/30"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
              </button>

              <button
                onClick={() => setActiveTab('signup')}
                className={`relative z-10 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'signup' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" /> Sign Up
                {activeTab === 'signup' && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg -z-10 shadow-md shadow-purple-500/30"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
              </button>

              <button
                onClick={() => setActiveTab('admin')}
                className={`relative z-10 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === 'admin' ? 'text-amber-200' : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" /> Admin
                {activeTab === 'admin' && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 bg-gradient-to-r from-amber-600 to-yellow-600 rounded-lg -z-10 shadow-md shadow-amber-500/30"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
              </button>
            </div>
          ) : (
            <div className="p-4 pb-0 flex items-center justify-between border-b border-white/5 m-2 mb-0">
              <button
                onClick={() => {
                  setActiveTab('login');
                  setOtpSent(false);
                }}
                className="text-xs text-purple-300 hover:text-white flex items-center gap-1 font-medium transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" /> Security OTP Recovery
              </span>
            </div>
          )}

          <CardContent className="px-6 pb-6 pt-3">
            <AnimatePresence mode="wait">
              {/* LOGIN TAB */}
              {activeTab === 'login' && (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Username, Email, or WhatsApp Number</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Enter username, email, or phone"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-9 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-300">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryContact('');
                          setOtpSent(false);
                          setActiveTab('forgot');
                        }}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500 text-xs"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full gradient-button font-semibold py-5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 text-xs"
                  >
                    {loading ? 'Verifying...' : 'Sign In to HabitBot'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.form>
              )}

              {/* SIGN UP TAB */}
              {activeTab === 'signup' && (
                <motion.form
                  key="signup"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSignup}
                  className="space-y-3"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Choose Username *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Unique username (min 3 chars)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-9 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-cyan-400" /> Recovery Email *
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-400" /> WhatsApp Phone Number *
                    </label>
                    <Input
                      type="tel"
                      required
                      placeholder="+1 234 567 890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Create Password *</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="password"
                        placeholder="Min 6 chars (letters + numbers)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="password"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-9 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-white/5 space-y-0.5">
                    <span className="font-semibold text-purple-300">🔒 Account Security:</span>
                    <div>• Email & WhatsApp are verified for password recovery OTPs.</div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full gradient-button font-semibold py-5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 text-xs"
                  >
                    {loading ? 'Registering...' : 'Create Account & Assign ID'}
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                </motion.form>
              )}

              {/* FORGOT PASSWORD VIA EMAIL / WHATSAPP OTP */}
              {activeTab === 'forgot' && (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3.5"
                >
                  {!otpSent ? (
                    /* STEP 1: Enter Email or WhatsApp */
                    <form onSubmit={handleRequestOTP} className="space-y-3.5">
                      <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs text-cyan-300 space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-cyan-400" /> Secure OTP Dispatch
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Enter your registered <b>Email Address</b> or <b>WhatsApp Phone Number</b> to receive a 6-digit security code.
                        </p>
                        <div className="text-[10px] text-amber-300/90 pt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>Usernames cannot be used for recovery for security protection.</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-300">Registered Email or WhatsApp Number</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            type="text"
                            placeholder="you@email.com OR +1234567890"
                            value={recoveryContact}
                            onChange={(e) => setRecoveryContact(e.target.value)}
                            className="pl-9 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500 text-xs"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-semibold py-5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 text-xs text-white"
                      >
                        {loading ? 'Sending OTP Code...' : '📲 Send 6-Digit OTP Code'}
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  ) : (
                    /* STEP 2: Input OTP & Set New Password */
                    <form onSubmit={handleVerifyOTPAndReset} className="space-y-3.5">
                      {generatedOtpInfo && (
                        <div className="p-3.5 bg-gradient-to-r from-cyan-950/40 via-purple-950/40 to-slate-900/60 border border-cyan-500/30 rounded-xl space-y-2 text-xs">
                          <div className="flex items-center justify-between text-cyan-300 font-semibold">
                            <span className="flex items-center gap-1.5">
                              {generatedOtpInfo.isPhone ? (
                                <MessageCircle className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Mail className="w-4 h-4 text-cyan-400" />
                              )}
                              Security OTP Dispatched
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Expires in 10m</span>
                          </div>

                          <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-lg border border-white/10">
                            <div>
                              <div className="text-[10px] text-slate-400">Your 6-Digit Verification Code:</div>
                              <div className="text-xl font-bold font-mono text-cyan-300 tracking-widest">
                                {generatedOtpInfo.otp}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => copyOTP(generatedOtpInfo.otp)}
                              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-white/10 flex items-center gap-1 transition-colors"
                            >
                              {copiedOtp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedOtp ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>

                          {generatedOtpInfo.isPhone && (
                            <a
                              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                `*HabitBot Security Verification*\nYour 6-digit password reset code is: *${generatedOtpInfo.otp}*\n(Valid for 10 minutes)`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold gap-1.5 transition-colors shadow-md"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Open in WhatsApp</span>
                            </a>
                          )}
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-300">Enter 6-Digit Verification Code *</label>
                        <Input
                          type="text"
                          maxLength={6}
                          placeholder="e.g. 849201"
                          value={enteredOtp}
                          onChange={(e) => setEnteredOtp(e.target.value)}
                          className="bg-slate-900/60 border-cyan-500/30 text-cyan-300 font-mono tracking-widest text-center text-base py-4 font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-300">New Secure Password *</label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            type="password"
                            placeholder="Min 6 chars (letters + numbers)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="pl-9 bg-slate-900/60 border-white/10 text-white text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-300">Confirm New Password *</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            type="password"
                            placeholder="Re-enter new password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className="pl-9 bg-slate-900/60 border-white/10 text-white text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setOtpSent(false)}
                          className="text-xs bg-slate-900 border-white/10 text-slate-400 hover:text-white"
                        >
                          Change Contact
                        </Button>

                        <Button
                          type="submit"
                          disabled={loading}
                          className="flex-1 gradient-button font-semibold py-5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 text-xs"
                        >
                          {loading ? 'Verifying OTP...' : '🔒 Verify OTP & Reset Password'}
                        </Button>
                      </div>
                    </form>
                  )}
                </motion.div>
              )}

              {/* ADMIN TAB */}
              {activeTab === 'admin' && (
                <motion.form
                  key="admin"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleAdminLogin}
                  className="space-y-4"
                >
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Creator portal: Default login is <b>admin</b> / <b>admin123</b></span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Admin Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="admin"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-9 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Admin Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="password"
                        placeholder="admin123"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-amber-500"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white font-semibold py-5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    {loading ? 'Authenticating...' : 'Access Creator Portal'}
                    <Shield className="w-4 h-4" />
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Quick Feature Pills Below Card */}
        <div className="mt-4 p-3 bg-slate-900/40 rounded-xl border border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-300 font-medium">Creator Demo:</span>
            <span className="font-mono text-amber-300">admin / admin123</span>
          </div>
          <button
            onClick={() => setShowGuideModal(true)}
            className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Guide</span>
          </button>
        </div>
      </motion.div>

      {/* Interactive User Guide & Feature Tour Dialog Modal */}
      <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
        <DialogContent className="max-w-2xl bg-slate-950/95 border border-white/10 text-white rounded-2xl p-6 shadow-2xl backdrop-blur-2xl max-h-[85vh] overflow-y-auto custom-scrollbar space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold gradient-text flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <span>HabitBot v5.0 — Quick User Guide & Tips</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Master the suite in 2 minutes: AI coaching, habit matrices, deep work pomodoro, and Excel life audits.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {GUIDE_SECTIONS.map((sec, i) => {
              const Icon = sec.icon;
              return (
                <div
                  key={i}
                  className="p-3.5 bg-slate-900/60 rounded-xl border border-white/5 space-y-1.5 hover:border-purple-500/20 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <div className="p-1.5 rounded-lg bg-slate-950 border border-white/10">
                      <Icon className={`w-4 h-4 ${sec.color}`} />
                    </div>
                    <span>{sec.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{sec.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 bg-gradient-to-r from-purple-950/40 via-cyan-950/40 to-slate-900/60 rounded-xl border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-semibold text-white">Ready to begin your behavioral transformation?</div>
              <div className="text-[11px] text-slate-400">Sign in with an existing account or register in 5 seconds.</div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowGuideModal(false)}
              className="gradient-button text-xs px-4 rounded-lg shrink-0"
            >
              Get Started
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
