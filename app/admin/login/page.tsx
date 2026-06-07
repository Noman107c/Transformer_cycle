'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Cpu, Lock, Mail, ShieldCheck, Copy, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const DEMO_EMAIL = 'admin@gmail.com';
const DEMO_PASSWORD = '12345678';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const handleCopy = async (text: string, type: 'email' | 'pass') => {
    await navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Welcome back, ${data.user.name}!`);
        router.push('/admin/dashboard');
      } else {
        toast.error(data.error || 'Login failed');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c1f] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(#4f6ef7 1px, transparent 1px), linear-gradient(to right, #4f6ef7 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative w-full max-w-md space-y-6">
        {/* Logo / Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 shadow-lg shadow-blue-900/30 mx-auto">
            <Cpu className="text-cyan-400 animate-pulse" size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">TranSys Admin</h1>
            <p className="text-sm text-cyan-400/80 font-semibold tracking-wider uppercase mt-1">Transformer Management Portal</p>
          </div>
        </div>

        {/* Demo Credentials Card */}
        <div className="bg-gradient-to-br from-blue-950/60 to-cyan-950/30 border border-cyan-500/20 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={16} className="text-cyan-400" />
            <span className="text-xs font-black text-cyan-300 uppercase tracking-widest">Demo Credentials</span>
          </div>
          <div className="space-y-2">
            {/* Email row */}
            <div className="flex items-center justify-between bg-[#0a0e27]/70 border border-blue-500/10 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-blue-400" />
                <span className="text-xs font-mono text-white">{DEMO_EMAIL}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(DEMO_EMAIL, 'email')}
                className="p-1 text-muted-foreground hover:text-cyan-400 transition-colors"
                title="Copy email"
              >
                {copiedEmail ? <CheckCheck size={13} className="text-green-400" /> : <Copy size={13} />}
              </button>
            </div>
            {/* Password row */}
            <div className="flex items-center justify-between bg-[#0a0e27]/70 border border-blue-500/10 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Lock size={13} className="text-blue-400" />
                <span className="text-xs font-mono text-white">{DEMO_PASSWORD}</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(DEMO_PASSWORD, 'pass')}
                className="p-1 text-muted-foreground hover:text-cyan-400 transition-colors"
                title="Copy password"
              >
                {copiedPass ? <CheckCheck size={13} className="text-green-400" /> : <Copy size={13} />}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={fillDemo}
            className="mt-3 w-full text-xs font-bold text-cyan-400 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg py-2 transition-all duration-200 cursor-pointer"
          >
            ↙ Fill in credentials automatically
          </button>
        </div>

        {/* Login Form */}
        <div className="bg-[#0f1429]/90 border border-blue-500/15 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
          <h2 className="text-lg font-black text-white mb-6 tracking-tight">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  autoComplete="email"
                  className="w-full bg-[#0a0e27] border border-blue-500/15 rounded-xl pl-10 pr-4 py-3 text-sm font-semibold text-white placeholder-muted-foreground focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-[#0a0e27] border border-blue-500/15 rounded-xl pl-10 pr-12 py-3 text-sm font-semibold text-white placeholder-muted-foreground focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="admin-login-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-black text-sm rounded-xl transition-all duration-200 shadow-lg shadow-blue-900/30 disabled:opacity-60 disabled:cursor-not-allowed uppercase tracking-wider cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                'Sign In to Admin Panel'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Transformer Lifecycle Management System &copy; 2024
        </p>
      </div>
    </div>
  );
}
