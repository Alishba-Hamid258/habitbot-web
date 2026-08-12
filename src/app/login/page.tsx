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
  FileText,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { registerUser, authenticateUser, sendPasswordResetOTP, verifyOTPAndResetPassword, authenticateAdminWithCode } from '@/lib/auth-storage';

type TabType = 'login' | 'signup' | 'admin' | 'forgot';

const WHY_HABITBOT_SECTIONS = [
  {
    title: '🧠 1. Science-Backed Behavioral Transformation',
    icon: Bot,
    color: 'text-indigo-600 dark:text-purple-400',
    desc: 'Based on James Clear’s Atomic Habits system. Stop relying on fleeting motivation and build automatic 2-minute daily rituals that compound into massive results.',
  },
  {
    title: '📄 2. AI Document, Book & PDF Coach',
    icon: FileText,
    color: 'text-indigo-600 dark:text-cyan-400',
    desc: 'Upload any habit book, study guide, work checklist, or PDF handout. HabitBot instantly parses full chapters and translates them into actionable daily micro-routines.',
  },
  {
    title: '👁️ 3. Image Vision & Quote OCR',
    icon: Sparkles,
    color: 'text-emerald-600 dark:text-emerald-400',
    desc: 'Snap a picture of your workout schedule, motivational poster, or handwritten notes. Built-in OCR and Vision extract the text and coach you directly on your photo.',
  },
  {
    title: '🎧 4. Deep Work Pomodoro & Ambient Media',
    icon: Headphones,
    color: 'text-amber-600 dark:text-amber-400',
    desc: 'Eliminate distractions with 25-minute focus intervals. Listen to curated Lofi tracks (including Lofi Nasheed & Heavy Rain), paste any YouTube link, or upload your own device audio/video files.',
  },
  {
    title: '📋 5. AI Action Sprints & Manual Task Reordering',
    icon: CheckSquare,
    color: 'text-blue-600 dark:text-indigo-400',
    desc: 'Break big goals into 4 clear micro-tasks. Reorder tasks with smooth Up/Down swap arrows, sort High-to-Low, and earn permanent XP balance in your Master Database.',
  },
  {
    title: '📊 6. Permanent Daily Logbook & Excel Life Audit',
    icon: FileSpreadsheet,
    color: 'text-pink-600 dark:text-pink-400',
    desc: 'Track streak milestones, protect your habits with Freeze Day ❄️ when traveling, and download clean multi-sheet Excel (.xlsx) spreadsheets of your lifetime progress anytime.',
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
  const [adminCode, setAdminCode] = useState('');

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
    if (!adminCode.trim()) {
      toast.error('Please enter the Creator Master Passcode.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const res = authenticateAdminWithCode(adminCode);
      if (!res.success) {
        toast.error(res.error || 'Invalid Creator Access Code. Access denied.');
        return;
      }

      toast.success('👑 Welcome Creator! Admin Portal Unlocked.');
      router.push('/admin');
    }, 500);
  };

  const copyOTP = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedOtp(true);
    toast.success('OTP code copied!');
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 py-8 overflow-x-hidden bg-slate-50 dark:bg-[#090d16] transition-colors">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 dark:bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-500/10 dark:bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card */}
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
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 dark:bg-gradient-to-tr dark:from-purple-600 dark:to-cyan-500 p-0.5 shadow-md mb-2"
          >
            <div className="w-full h-full bg-slate-900 dark:bg-slate-950 rounded-2xl flex items-center justify-center">
              <Bot className="w-8 h-8 text-white dark:text-purple-400" />
            </div>
          </motion.div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:gradient-text">
            HabitBot
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" /> AI Behavioral & Performance Coach
          </p>

          {/* Why Use HabitBot Feature Highlights Button */}
          <button
            onClick={() => setShowGuideModal(true)}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 dark:bg-purple-950/70 dark:border-purple-500/30 dark:text-purple-300 dark:hover:text-white dark:hover:bg-purple-900/60 transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" />
            <span>Why Use HabitBot? Read Features & Capabilities</span>
            <ChevronRight className="w-3 h-3 text-indigo-600 dark:text-purple-400" />
          </button>
        </div>

        <Card className="bg-white dark:bg-slate-950/90 border border-slate-200/80 dark:border-white/10 shadow-xl dark:shadow-2xl">
          {/* Custom Animated Tabs Bar */}
          {activeTab !== 'forgot' ? (
            <div className="grid grid-cols-3 p-1.5 m-4 bg-slate-100 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-white/5 relative">
              <button
                onClick={() => setActiveTab('login')}
                className={`relative z-10 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'login' ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5" /> Login
                {activeTab === 'login' && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 bg-slate-900 dark:bg-gradient-to-r dark:from-purple-600 dark:to-indigo-600 rounded-lg -z-10 shadow-sm"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
              </button>

              <button
                onClick={() => setActiveTab('signup')}
                className={`relative z-10 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'signup' ? 'text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" /> Sign Up
                {activeTab === 'signup' && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 bg-slate-900 dark:bg-gradient-to-r dark:from-purple-600 dark:to-indigo-600 rounded-lg -z-10 shadow-sm"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
              </button>

              <button
                onClick={() => setActiveTab('admin')}
                className={`relative z-10 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'admin' ? 'text-white' : 'text-amber-700 dark:text-slate-400 hover:text-amber-800 dark:hover:text-amber-300'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-500" /> Admin
                {activeTab === 'admin' && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 bg-amber-600 dark:bg-gradient-to-r dark:from-amber-600 dark:to-yellow-600 rounded-lg -z-10 shadow-sm"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
              </button>
            </div>
          ) : (
            <div className="p-4 pb-0 flex items-center justify-between border-b border-slate-100 dark:border-white/5 m-2 mb-0">
              <button
                onClick={() => {
                  setActiveTab('login');
                  setOtpSent(false);
                }}
                className="text-xs text-indigo-600 dark:text-purple-300 hover:text-indigo-800 dark:hover:text-white flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" /> Security OTP Recovery
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
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Username, Email, or WhatsApp Number</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Enter username, email, or phone"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-9 bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-indigo-500 text-xs shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryContact('');
                          setOtpSent(false);
                          setActiveTab('forgot');
                        }}
                        className="text-[11px] text-indigo-600 dark:text-cyan-400 hover:underline transition-colors cursor-pointer font-medium"
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
                        className="pl-9 bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-indigo-500 text-xs shadow-sm"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:gradient-button font-semibold py-5 rounded-xl flex items-center justify-center gap-2 shadow-sm text-xs cursor-pointer"
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
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Choose Username *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Unique username (min 3 chars)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-9 bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-indigo-500 text-xs shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-indigo-600 dark:text-cyan-400" /> Recovery Email *
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-indigo-500 text-xs shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> WhatsApp Phone Number *
                    </label>
                    <Input
                      type="tel"
                      required
                      placeholder="+1 234 567 890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-indigo-500 text-xs shadow-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Create Password *</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="password"
                        placeholder="Min 6 chars (letters + numbers)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-indigo-500 text-xs shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="password"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-9 bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-indigo-500 text-xs shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-200 dark:border-white/5 space-y-0.5">
                    <span className="font-semibold text-indigo-700 dark:text-purple-300">🔒 Account Security:</span>
                    <div>• Email & WhatsApp are verified for password recovery OTPs.</div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:gradient-button font-semibold py-5 rounded-xl flex items-center justify-center gap-2 shadow-sm text-xs cursor-pointer"
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
                      <div className="p-3 bg-sky-50 dark:bg-cyan-500/10 border border-sky-200 dark:border-cyan-500/20 rounded-xl text-xs text-sky-800 dark:text-cyan-300 space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-indigo-600 dark:text-cyan-400" /> Secure OTP Dispatch
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300">
                          Enter your registered <b>Email Address</b> or <b>WhatsApp Phone Number</b> to receive a 6-digit security code.
                        </p>
                        <div className="text-[10px] text-amber-700 dark:text-amber-300/90 pt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>Usernames cannot be used for recovery for security protection.</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Registered Email or WhatsApp Number</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            type="text"
                            placeholder="you@email.com OR +1234567890"
                            value={recoveryContact}
                            onChange={(e) => setRecoveryContact(e.target.value)}
                            className="pl-9 bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-indigo-500 text-xs shadow-sm"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-slate-900 hover:bg-slate-800 font-semibold py-5 rounded-xl flex items-center justify-center gap-2 shadow-sm text-xs text-white cursor-pointer"
                      >
                        {loading ? 'Sending OTP Code...' : '📲 Send 6-Digit OTP Code'}
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  ) : (
                    /* STEP 2: Input OTP & Set New Password */
                    <form onSubmit={handleVerifyOTPAndReset} className="space-y-3.5">
                      {generatedOtpInfo && (
                        <div className="p-3.5 bg-slate-50 dark:bg-gradient-to-r dark:from-cyan-950/40 dark:via-purple-950/40 dark:to-slate-900/60 border border-slate-200 dark:border-cyan-500/30 rounded-xl space-y-2 text-xs">
                          <div className="flex items-center justify-between text-slate-900 dark:text-cyan-300 font-semibold">
                            <span className="flex items-center gap-1.5">
                              {generatedOtpInfo.isPhone ? (
                                <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Mail className="w-4 h-4 text-indigo-600 dark:text-cyan-400" />
                              )}
                              Security OTP Dispatched
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Expires in 10m</span>
                          </div>

                          <div className="flex items-center justify-between bg-white dark:bg-slate-950/80 p-2.5 rounded-lg border border-slate-200 dark:border-white/10 shadow-sm">
                            <div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Your 6-Digit Verification Code:</div>
                              <div className="text-xl font-bold font-mono text-indigo-600 dark:text-cyan-300 tracking-widest">
                                {generatedOtpInfo.otp}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => copyOTP(generatedOtpInfo.otp)}
                              className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md border border-slate-200 dark:border-white/10 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              {copiedOtp ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
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
                              className="inline-flex items-center justify-center w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold gap-1.5 transition-colors shadow-sm"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Open in WhatsApp</span>
                            </a>
                          )}
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Enter 6-Digit Verification Code *</label>
                        <Input
                          type="text"
                          maxLength={6}
                          placeholder="e.g. 849201"
                          value={enteredOtp}
                          onChange={(e) => setEnteredOtp(e.target.value)}
                          className="bg-white dark:bg-slate-900/60 border-slate-300 dark:border-cyan-500/30 text-indigo-600 dark:text-cyan-300 font-mono tracking-widest text-center text-base py-4 font-bold shadow-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">New Secure Password *</label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            type="password"
                            placeholder="Min 6 chars (letters + numbers)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="pl-9 bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Confirm New Password *</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Input
                            type="password"
                            placeholder="Re-enter new password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className="pl-9 bg-slate-50 dark:bg-slate-900/60 border-slate-300 dark:border-white/10 text-slate-900 dark:text-white text-xs shadow-sm"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setOtpSent(false)}
                          className="text-xs bg-white hover:bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                        >
                          Change Contact
                        </Button>

                        <Button
                          type="submit"
                          disabled={loading}
                          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white dark:gradient-button font-semibold py-5 rounded-xl flex items-center justify-center gap-2 shadow-sm text-xs cursor-pointer"
                        >
                          {loading ? 'Verifying OTP...' : '🔒 Verify OTP & Reset Password'}
                        </Button>
                      </div>
                    </form>
                  )}
                </motion.div>
              )}

              {/* ADMIN / CREATOR MASTER TAB */}
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
                  <div className="p-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                      <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Creator Master Portal</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Private management interface for user accounts, data audits, and system configuration.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Creator Master Passcode / PIN</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="password"
                        placeholder="Enter private Master Access Code"
                        value={adminCode}
                        onChange={(e) => setAdminCode(e.target.value)}
                        className="pl-9 bg-slate-50 dark:bg-slate-900/60 border-amber-300 dark:border-amber-500/30 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-amber-500 text-xs font-mono shadow-sm"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-5 rounded-xl flex items-center justify-center gap-2 shadow-sm text-xs cursor-pointer"
                  >
                    {loading ? 'Verifying Security Key...' : 'Unlock Creator Portal 🛡️'}
                    <Shield className="w-4 h-4" />
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Why Choose HabitBot Feature Tour Dialog Modal */}
      <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-950/95 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl p-6 shadow-2xl backdrop-blur-2xl max-h-[85vh] overflow-y-auto custom-scrollbar space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:gradient-text flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-purple-400" />
              <span>Why Choose HabitBot v5.0 Pro Suite?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Transforming ambitious aspirations into automatic daily atomic habits with cutting-edge behavioral AI.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {WHY_HABITBOT_SECTIONS.map((sec, i) => {
              const Icon = sec.icon;
              return (
                <div
                  key={i}
                  className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-white/5 space-y-1.5 hover:border-slate-300 dark:hover:border-purple-500/20 transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-slate-950 border border-indigo-200 dark:border-white/10">
                      <Icon className={`w-4 h-4 ${sec.color}`} />
                    </div>
                    <span>{sec.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{sec.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 bg-slate-50 dark:bg-gradient-to-r dark:from-purple-950/40 dark:via-cyan-950/40 dark:to-slate-900/60 rounded-xl border border-slate-200 dark:border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">Ready to begin your behavioral transformation?</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Sign in with an existing account or register in 5 seconds.</div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowGuideModal(false)}
              className="bg-slate-900 hover:bg-slate-800 text-white dark:gradient-button text-xs px-4 rounded-lg shrink-0 cursor-pointer shadow-sm"
            >
              Get Started
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
