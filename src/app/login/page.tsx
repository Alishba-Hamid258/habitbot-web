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
  Zap,
  Flame,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { registerUser, authenticateUser, sendPasswordResetOTP, verifyOTPAndResetPassword, authenticateAdminWithCode } from '@/lib/auth-storage';

type TabType = 'login' | 'signup' | 'admin' | 'forgot';

const WHY_HABITBOT_SECTIONS = [
  {
    title: '1. XP, Streaks & Rolling Discipline',
    icon: Zap,
    color: 'text-amber-500',
    desc: 'Earn +10 XP per habit, +50 XP for perfect days, and +5 XP per sprint task. Streaks track continuous execution with Freeze Day protection, while dynamic discipline scores evaluate your 7-day consistency.',
  },
  {
    title: '2. Atomic Habit Stacking',
    icon: Bot,
    color: 'text-primary',
    desc: 'Based on James Clear’s Atomic Habits methodology. Build automatic 2-minute daily rituals that compound into lasting routines.',
  },
  {
    title: '3. Document & PDF Coach',
    icon: FileText,
    color: 'text-primary',
    desc: 'Upload study guides, habit books, or PDF handouts. HabitBot parses chapters and translates them into actionable daily micro-routines.',
  },
  {
    title: '4. Image OCR & Vision',
    icon: Sparkles,
    color: 'text-purple-500',
    desc: 'Snap a picture of your workout schedule, notes, or quotes. Built-in OCR and Vision extract text and provide direct coaching.',
  },
  {
    title: '5. Focus Timer & Ambient Audio',
    icon: Headphones,
    color: 'text-amber-500',
    desc: 'Eliminate distractions with customizable 25-minute Pomodoro intervals. Play curated lofi streams, YouTube tracks, or local device audio.',
  },
  {
    title: '6. Task Sprints & Priority Order',
    icon: CheckSquare,
    color: 'text-blue-500',
    desc: 'Break large goals into 4 concrete micro-tasks. Reorder tasks with ⬆️/⬇️ swap buttons and earn XP in your permanent database.',
  },
  {
    title: '7. Logbook & Excel Life Audit',
    icon: FileSpreadsheet,
    color: 'text-pink-500',
    desc: 'Track daily reflections, protect your streak with Streak Freeze on rest days, and export complete multi-sheet Excel (.xlsx) files.',
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
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 py-8 bg-background transition-colors">
      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground mb-2.5">
            <Bot className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            HabitBot
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Behavioral routines, task sprints & focus workspace
          </p>

          {/* Feature Highlights Modal Trigger */}
          <button
            onClick={() => setShowGuideModal(true)}
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Why HabitBot? Feature Guide</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>

        <Card className="bg-card border border-border rounded-xl shadow-xs">
          {/* Segmented Control Tabs */}
          {activeTab !== 'forgot' ? (
            <div className="grid grid-cols-3 p-0.5 m-3.5 mb-0 bg-muted/60 rounded-lg border border-border/50 relative">
              <button
                onClick={() => setActiveTab('login')}
                className={`py-1 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Lock className="w-3 h-3" /> Login
              </button>

              <button
                onClick={() => setActiveTab('signup')}
                className={`py-1 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'signup'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <User className="w-3 h-3" /> Sign Up
              </button>

              <button
                onClick={() => setActiveTab('admin')}
                className={`py-1 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-background text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shield className="w-3 h-3 text-amber-500" /> Admin
              </button>
            </div>
          ) : (
            <div className="p-3.5 pb-0 flex items-center justify-between border-b border-border m-1 mb-0">
              <button
                onClick={() => {
                  setActiveTab('login');
                  setOtpSent(false);
                }}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </button>
              <span className="text-xs font-medium text-foreground flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-primary" /> OTP Recovery
              </span>
            </div>
          )}

          <CardContent className="p-4 pt-3.5">
            <AnimatePresence mode="wait">
              {/* LOGIN TAB */}
              {activeTab === 'login' && (
                <motion.form
                  key="login"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.15 }}
                  onSubmit={handleLogin}
                  className="space-y-3"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Username, Email, or Phone</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Username, email, or phone"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-8 bg-background border-border text-foreground placeholder:text-muted-foreground rounded-md text-xs h-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-foreground">Password</label>
                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryContact('');
                          setOtpSent(false);
                          setActiveTab('forgot');
                        }}
                        className="text-[11px] text-primary hover:underline cursor-pointer font-medium"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-8 bg-background border-border text-foreground placeholder:text-muted-foreground rounded-md text-xs h-8"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-8 rounded-md flex items-center justify-center gap-1.5 shadow-none text-xs cursor-pointer mt-1"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </motion.form>
              )}

              {/* SIGN UP TAB */}
              {activeTab === 'signup' && (
                <motion.form
                  key="signup"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.15 }}
                  onSubmit={handleSignup}
                  className="space-y-2.5"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Username *</label>
                    <Input
                      type="text"
                      placeholder="e.g. alex_dev"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-md text-xs h-8 px-2.5"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3 text-primary" /> Recovery Email *
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-md text-xs h-8 px-2.5"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" /> WhatsApp Number *
                    </label>
                    <Input
                      type="tel"
                      required
                      placeholder="+1 234 567 890"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-md text-xs h-8 px-2.5"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Password *</label>
                    <Input
                      type="password"
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-md text-xs h-8 px-2.5"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Confirm Password *</label>
                    <Input
                      type="password"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground rounded-md text-xs h-8 px-2.5"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-8 rounded-md flex items-center justify-center gap-1.5 shadow-none text-xs cursor-pointer mt-1"
                  >
                    {loading ? 'Creating...' : 'Create Account'}
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </Button>
                </motion.form>
              )}

              {/* FORGOT PASSWORD VIA EMAIL / WHATSAPP OTP */}
              {activeTab === 'forgot' && (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  {!otpSent ? (
                    <form onSubmit={handleRequestOTP} className="space-y-3">
                      <div className="p-2.5 bg-primary/10 rounded-lg text-xs text-primary space-y-0.5 border border-primary/20">
                        <div className="font-semibold flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5" /> Password Recovery
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Enter your Email or WhatsApp number to receive a 6-digit verification code.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Email or WhatsApp Number</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input
                            type="text"
                            placeholder="you@email.com or +1234567890"
                            value={recoveryContact}
                            onChange={(e) => setRecoveryContact(e.target.value)}
                            className="pl-8 bg-background border-border text-foreground placeholder:text-muted-foreground rounded-md text-xs h-8"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/90 font-medium h-8 rounded-md flex items-center justify-center gap-1.5 shadow-none text-xs text-primary-foreground cursor-pointer"
                      >
                        {loading ? 'Sending Code...' : 'Send Verification Code'}
                        <Send className="w-3.5 h-3.5" />
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOTPAndReset} className="space-y-3">
                      {generatedOtpInfo && (
                        <div className="p-2.5 bg-muted/50 border border-border rounded-lg space-y-1.5 text-xs">
                          <div className="flex items-center justify-between text-foreground font-medium">
                            <span className="flex items-center gap-1 text-[11px]">
                              {generatedOtpInfo.isPhone ? (
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Mail className="w-3.5 h-3.5 text-primary" />
                              )}
                              Code Dispatched
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">10m expiry</span>
                          </div>

                          <div className="flex items-center justify-between bg-card p-2 rounded-md border border-border">
                            <div>
                              <div className="text-[10px] text-muted-foreground">Verification Code:</div>
                              <div className="text-base font-bold font-mono text-primary tracking-wider">
                                {generatedOtpInfo.otp}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => copyOTP(generatedOtpInfo.otp)}
                              className="px-2 py-0.5 text-xs bg-muted hover:bg-muted/80 text-foreground rounded flex items-center gap-1 cursor-pointer"
                            >
                              {copiedOtp ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedOtp ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Enter 6-Digit Code *</label>
                        <Input
                          type="text"
                          maxLength={6}
                          placeholder="849201"
                          value={enteredOtp}
                          onChange={(e) => setEnteredOtp(e.target.value)}
                          className="bg-background border-border text-primary font-mono tracking-widest text-center text-sm h-8 rounded-md font-bold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">New Password *</label>
                        <Input
                          type="password"
                          placeholder="Min 6 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-background border-border text-foreground rounded-md text-xs h-8 px-2.5"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground">Confirm New Password *</label>
                        <Input
                          type="password"
                          placeholder="Re-enter password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="bg-background border-border text-foreground rounded-md text-xs h-8 px-2.5"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-0.5">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setOtpSent(false)}
                          className="text-xs bg-card hover:bg-muted border-border text-foreground rounded-md cursor-pointer h-8"
                        >
                          Change
                        </Button>

                        <Button
                          type="submit"
                          disabled={loading}
                          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-8 rounded-md flex items-center justify-center gap-1.5 shadow-none text-xs cursor-pointer"
                        >
                          {loading ? 'Resetting...' : 'Reset Password'}
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
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.15 }}
                  onSubmit={handleAdminLogin}
                  className="space-y-3"
                >
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-xs text-amber-800 dark:text-amber-300 space-y-0.5 border border-amber-200 dark:border-amber-800/40">
                    <div className="font-semibold flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-amber-600" />
                      <span>Creator Portal</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Access user account records and database configurations.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Passcode / PIN</label>
                    <Input
                      type="password"
                      placeholder="Access Code"
                      value={adminCode}
                      onChange={(e) => setAdminCode(e.target.value)}
                      className="bg-background border-border text-foreground text-xs font-mono rounded-md h-8 px-2.5"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-8 rounded-md flex items-center justify-center gap-1.5 shadow-none text-xs cursor-pointer mt-1"
                  >
                    {loading ? 'Verifying...' : 'Unlock Portal'}
                    <Shield className="w-3.5 h-3.5" />
                  </Button>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Feature Tour Modal */}
      <Dialog open={showGuideModal} onOpenChange={setShowGuideModal}>
        <DialogContent className="max-w-2xl bg-card border border-border text-foreground rounded-xl p-6 shadow-xl max-h-[85vh] overflow-y-auto custom-scrollbar space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              <span>Why Choose HabitBot?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Core architecture designed for deep focus and atomic habit formation.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {WHY_HABITBOT_SECTIONS.map((sec, i) => {
              const Icon = sec.icon;
              return (
                <div
                  key={i}
                  className="p-3 bg-muted/40 rounded-lg border border-border/80 space-y-1"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Icon className={`w-3.5 h-3.5 ${sec.color}`} />
                    <span>{sec.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{sec.desc}</p>
                </div>
              );
            })}
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
    </div>
  );
}
