'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Bot, Lock, User, Shield, Sparkles, ArrowRight, CheckCircle2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { registerUser, authenticateUser } from '@/lib/auth-storage';

type TabType = 'login' | 'signup' | 'admin';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('login');
  const [loading, setLoading] = useState(false);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Please enter your username and password.');
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
      toast.error('Please fill in all registration fields.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match! Please verify your password.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const res = registerUser(username, password);
      if (!res.success) {
        toast.error(res.error || 'Registration failed.');
        return;
      }

      // Success! Pre-fill username and switch to Login tab so user can log in
      setPassword('');
      setConfirmPassword('');
      setActiveTab('login');
      toast.success(`🎉 Account created for "${res.user?.username}" (Assigned User ID: #${res.user?.id})! Please sign in now.`);
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

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-[#090d16]">
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
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 p-0.5 shadow-lg shadow-purple-500/20 mb-3"
          >
            <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
              <Bot className="w-8 h-8 text-purple-400" />
            </div>
          </motion.div>
          <h1 className="text-3xl font-extrabold tracking-tight gradient-text">
            HabitBot v5.0
          </h1>
          <p className="text-sm text-slate-400 mt-1 flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> AI-Powered Behavioral & Performance Coach
          </p>
        </div>

        <Card className="glass-panel border border-white/10 shadow-2xl backdrop-blur-2xl">
          {/* Custom Animated Tabs Bar */}
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

          <CardContent className="px-6 pb-6 pt-2">
            <AnimatePresence mode="wait">
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
                    <label className="text-xs font-medium text-slate-300">Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="pl-9 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full gradient-button font-semibold py-5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                  >
                    {loading ? 'Verifying...' : 'Sign In to HabitBot'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </motion.form>
              )}

              {activeTab === 'signup' && (
                <motion.form
                  key="signup"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSignup}
                  className="space-y-3.5"
                >
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Choose Username</label>
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
                    <label className="text-xs font-medium text-slate-300">Create Password</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="password"
                        placeholder="Min 6 chars (letters + numbers/symbols)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-purple-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Confirm Password</label>
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
                    <div className="font-semibold text-slate-300">🔒 Password Security Requirements:</div>
                    <div>• Minimum 6 characters</div>
                    <div>• Must contain letters and at least 1 number or symbol</div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full gradient-button font-semibold py-5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                  >
                    {loading ? 'Registering...' : 'Create Account & Assign ID'}
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                </motion.form>
              )}

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
      </motion.div>
    </div>
  );
}
