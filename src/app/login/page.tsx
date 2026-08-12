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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 py-8 bg-[#f8f9fa] dark:bg-[#121212] transition-colors">
      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1a73e8] text-white mb-3 shadow-none">
            <Bot className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#202124] dark:text-[#e8eaed]">
            HabitBot
          </h1>
          <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-1 flex items-center justify-center gap-1">
            <span>AI Behavioral & Performance Workspace</span>
          </p>

          {/* Why Use HabitBot Feature Highlights Button */}
          <button
            onClick={() => setShowGuideModal(true)}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] dark:bg-[#394457] dark:text-[#8ab4f8] transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Why Use HabitBot? Features & Capabilities</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <Card className="bg-white dark:bg-[#1e1e1e] border border-[#dadce0] dark:border-[#3c4043] rounded-3xl shadow-none">
          {/* Google Segmented Tabs Bar */}
          {activeTab !== 'forgot' ? (
            <div className="grid grid-cols-3 p-1 m-4 bg-[#f1f3f4] dark:bg-[#2d2e30] rounded-full relative">
              <button
                onClick={() => setActiveTab('login')}
                className={`relative z-10 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-white dark:bg-[#394457] text-[#1a73e8] dark:text-[#8ab4f8] shadow-sm font-semibold'
                    : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124]'
                }`}
              >
                <Lock className="w-3.5 h-3.5" /> Login
              </button>

              <button
                onClick={() => setActiveTab('signup')}
                className={`relative z-10 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'signup'
                    ? 'bg-white dark:bg-[#394457] text-[#1a73e8] dark:text-[#8ab4f8] shadow-sm font-semibold'
                    : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124]'
                }`}
              >
                <User className="w-3.5 h-3.5" /> Sign Up
              </button>

              <button
                onClick={() => setActiveTab('admin')}
                className={`relative z-10 py-1.5 text-xs font-medium rounded-full transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-white dark:bg-[#394457] text-[#b06000] dark:text-[#fdd663] shadow-sm font-semibold'
                    : 'text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124]'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-[#f9ab00]" /> Admin
              </button>
            </div>
          ) : (
            <div className="p-4 pb-0 flex items-center justify-between border-b border-[#dadce0] dark:border-[#3c4043] m-2 mb-0">
              <button
                onClick={() => {
                  setActiveTab('login');
                  setOtpSent(false);
                }}
                className="text-xs text-[#1a73e8] dark:text-[#8ab4f8] hover:underline flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
              <span className="text-xs font-medium text-[#202124] dark:text-[#e8eaed] flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-[#1a73e8]" /> OTP Recovery
              </span>
            </div>
          )}

          <CardContent className="px-6 pb-6 pt-3">
            <AnimatePresence mode="wait">
              {/* LOGIN TAB */}
              {activeTab === 'login' && (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  onSubmit={handleLogin}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#202124] dark:text-[#e8eaed]">Username, Email, or WhatsApp Number</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
                      <Input
                        type="text"
                        placeholder="Enter username, email, or phone"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10 bg-[#f8f9fa] dark:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] rounded-full text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-[#202124] dark:text-[#e8eaed]">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryContact('');
                          setOtpSent(false);
                          setActiveTab('forgot');
                        }}
                        className="text-[11px] text-[#1a73e8] dark:text-[#8ab4f8] hover:underline cursor-pointer font-medium"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 bg-[#f8f9fa] dark:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] rounded-full text-xs"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium py-2.5 rounded-full flex items-center justify-center gap-2 shadow-none text-xs cursor-pointer"
                  >
                    {loading ? 'Verifying...' : 'Sign In'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.form>
              )}

              {/* SIGN UP TAB */}
              {activeTab === 'signup' && (
                <motion.form
                  key="signup"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  onSubmit={handleSignup}
                  className="space-y-3"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#202124] dark:text-[#e8eaed]">Choose Username *</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
                      <Input
                        type="text"
                        placeholder="Unique username (min 3 chars)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-10 bg-[#f8f9fa] dark:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] rounded-full text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#202124] dark:text-[#e8eaed] flex items-center gap-1">
                      <Mail className="w-3 h-3 text-[#1a73e8]" /> Recovery Email *
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-[#f8f9fa] dark:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] rounded-full text-xs px-4"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[#202124] dark:text-[#e8eaed] flex items-center gap-1">
                      <Phone className="w-3 h-3 text-[#1e8e3e]" /> WhatsApp Phone Number *
                    </label>
                    <Input
                      type="tel"
                      required
                      placeholder="+1 234 567 890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-[#f8f9fa] dark:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] rounded-full text-xs px-4"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#202124] dark:text-[#e8eaed]">Create Password *</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
                      <Input
                        type="password"
                        placeholder="Min 6 chars (letters + numbers)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 bg-[#f8f9fa] dark:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] rounded-full text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-[#202124] dark:text-[#e8eaed]">Confirm Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
                      <Input
                        type="password"
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 bg-[#f8f9fa] dark:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] rounded-full text-xs"
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-[#5f6368] dark:text-[#9aa0a6] bg-[#f8f9fa] dark:bg-[#2d2e30] p-2.5 rounded-xl border border-[#dadce0] dark:border-[#3c4043]">
                    <span className="font-medium text-[#1a73e8] dark:text-[#8ab4f8]">🔒 Account Security: </span>
                    Email & WhatsApp are used for password recovery OTPs.
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium py-2.5 rounded-full flex items-center justify-center gap-2 shadow-none text-xs cursor-pointer"
                  >
                    {loading ? 'Registering...' : 'Create Account'}
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                </motion.form>
              )}

              {/* FORGOT PASSWORD VIA EMAIL / WHATSAPP OTP */}
              {activeTab === 'forgot' && (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3.5"
                >
                  {!otpSent ? (
                    /* STEP 1: Enter Email or WhatsApp */
                    <form onSubmit={handleRequestOTP} className="space-y-3.5">
                      <div className="p-3 bg-[#e8f0fe] dark:bg-[#394457] rounded-2xl text-xs text-[#1967d2] dark:text-[#8ab4f8] space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-[#1a73e8]" /> Secure OTP Dispatch
                        </div>
                        <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                          Enter your registered <b>Email Address</b> or <b>WhatsApp Phone Number</b> to receive a 6-digit security code.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#202124] dark:text-[#e8eaed]">Registered Email or WhatsApp Number</label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
                          <Input
                            type="text"
                            placeholder="you@email.com OR +1234567890"
                            value={recoveryContact}
                            onChange={(e) => setRecoveryContact(e.target.value)}
                            className="pl-10 bg-[#f8f9fa] dark:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] rounded-full text-xs"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#1a73e8] hover:bg-[#1557b0] font-medium py-2.5 rounded-full flex items-center justify-center gap-2 shadow-none text-xs text-white cursor-pointer"
                      >
                        {loading ? 'Sending OTP Code...' : 'Send 6-Digit OTP Code'}
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  ) : (
                    /* STEP 2: Input OTP & Set New Password */
                    <form onSubmit={handleVerifyOTPAndReset} className="space-y-3.5">
                      {generatedOtpInfo && (
                        <div className="p-3.5 bg-[#f8f9fa] dark:bg-[#2d2e30] border border-[#dadce0] dark:border-[#3c4043] rounded-2xl space-y-2 text-xs">
                          <div className="flex items-center justify-between text-[#202124] dark:text-[#e8eaed] font-medium">
                            <span className="flex items-center gap-1.5">
                              {generatedOtpInfo.isPhone ? (
                                <MessageCircle className="w-4 h-4 text-[#1e8e3e]" />
                              ) : (
                                <Mail className="w-4 h-4 text-[#1a73e8]" />
                              )}
                              Security OTP Dispatched
                            </span>
                            <span className="text-[10px] text-[#5f6368] dark:text-[#9aa0a6] font-mono">Expires in 10m</span>
                          </div>

                          <div className="flex items-center justify-between bg-white dark:bg-[#1e1e1e] p-2.5 rounded-xl border border-[#dadce0] dark:border-[#3c4043]">
                            <div>
                              <div className="text-[10px] text-[#5f6368] dark:text-[#9aa0a6]">Your 6-Digit Code:</div>
                              <div className="text-xl font-bold font-mono text-[#1a73e8] dark:text-[#8ab4f8] tracking-widest">
                                {generatedOtpInfo.otp}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => copyOTP(generatedOtpInfo.otp)}
                              className="px-3 py-1 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] dark:bg-[#3c4043] dark:hover:bg-[#5f6368] text-[#202124] dark:text-[#e8eaed] rounded-full flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              {copiedOtp ? <Check className="w-3.5 h-3.5 text-[#1e8e3e]" /> : <Copy className="w-3.5 h-3.5" />}
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
                              className="inline-flex items-center justify-center w-full py-2 px-3 bg-[#1e8e3e] hover:bg-[#137333] text-white rounded-full text-xs font-medium gap-1.5 transition-colors shadow-none"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Open in WhatsApp</span>
                            </a>
                          )}
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#202124] dark:text-[#e8eaed]">Enter 6-Digit Code *</label>
                        <Input
                          type="text"
                          maxLength={6}
                          placeholder="e.g. 849201"
                          value={enteredOtp}
                          onChange={(e) => setEnteredOtp(e.target.value)}
                          className="bg-white dark:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#1a73e8] dark:text-[#8ab4f8] font-mono tracking-widest text-center text-base py-3 rounded-full font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#202124] dark:text-[#e8eaed]">New Secure Password *</label>
                        <div className="relative">
                          <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
                          <Input
                            type="password"
                            placeholder="Min 6 chars (letters + numbers)"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="pl-10 bg-[#f8f9fa] dark:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] rounded-full text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-[#202124] dark:text-[#e8eaed]">Confirm New Password *</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
                          <Input
                            type="password"
                            placeholder="Re-enter new password"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className="pl-10 bg-[#f8f9fa] dark:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] rounded-full text-xs"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setOtpSent(false)}
                          className="text-xs bg-white hover:bg-[#f1f3f4] dark:bg-[#1e1e1e] dark:hover:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] rounded-full cursor-pointer"
                        >
                          Change Contact
                        </Button>

                        <Button
                          type="submit"
                          disabled={loading}
                          className="flex-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium py-2.5 rounded-full flex items-center justify-center gap-2 shadow-none text-xs cursor-pointer"
                        >
                          {loading ? 'Verifying...' : 'Reset Password'}
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
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  onSubmit={handleAdminLogin}
                  className="space-y-4"
                >
                  <div className="p-3.5 bg-[#fef7e0] dark:bg-[#3c3010] rounded-2xl text-xs text-[#b06000] dark:text-[#fdd663] space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-[#f9ab00] shrink-0" />
                      <span>Creator Master Portal</span>
                    </div>
                    <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">
                      Private management interface for user accounts, data audits, and system configuration.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[#202124] dark:text-[#e8eaed]">Creator Master Passcode / PIN</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
                      <Input
                        type="password"
                        placeholder="Enter private Master Access Code"
                        value={adminCode}
                        onChange={(e) => setAdminCode(e.target.value)}
                        className="pl-10 bg-[#f8f9fa] dark:bg-[#2d2e30] border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] placeholder:text-[#5f6368] text-xs font-mono rounded-full"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium py-2.5 rounded-full flex items-center justify-center gap-2 shadow-none text-xs cursor-pointer"
                  >
                    {loading ? 'Verifying Security Key...' : 'Unlock Creator Portal'}
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
        <DialogContent className="max-w-2xl bg-white dark:bg-[#1e1e1e] border border-[#dadce0] dark:border-[#3c4043] text-[#202124] dark:text-[#e8eaed] rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#202124] dark:text-[#e8eaed] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#1a73e8]" />
              <span>Why Choose HabitBot?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-[#5f6368] dark:text-[#9aa0a6]">
              Transforming ambitious aspirations into automatic daily atomic habits with cutting-edge behavioral AI.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {WHY_HABITBOT_SECTIONS.map((sec, i) => {
              const Icon = sec.icon;
              return (
                <div
                  key={i}
                  className="p-3.5 bg-[#f8f9fa] dark:bg-[#2d2e30] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] space-y-1.5"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#202124] dark:text-[#e8eaed]">
                    <div className="p-1.5 rounded-full bg-[#e8f0fe] text-[#1a73e8]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{sec.title}</span>
                  </div>
                  <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] leading-relaxed">{sec.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 bg-[#f8f9fa] dark:bg-[#2d2e30] rounded-2xl border border-[#dadce0] dark:border-[#3c4043] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-semibold text-[#202124] dark:text-[#e8eaed]">Ready to begin your behavioral transformation?</div>
              <div className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6]">Sign in with an existing account or register in 5 seconds.</div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowGuideModal(false)}
              className="bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs px-5 py-2 rounded-full font-medium shadow-none cursor-pointer"
            >
              Get Started
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
