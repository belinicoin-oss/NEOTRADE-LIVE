'use client';

// Ported from NEOTRADE/frontend/src/pages/Auth.js
// Visual structure preserved 1:1. Backend wiring adapted to NEXTTRADE auth APIs:
//   - login        → api.login(email, password)
//   - register     → api.signup(email, password, name)            (single-step, no OTP)
//   - forgot       → api.passwordRequest(email)
//   - reset        → api.passwordReset(email, code, newPassword)
// All other UI/UX (slide-to-verify, terms checkbox, animated background blobs,
// gradient buttons, tab switcher, etc.) is identical to the original NeoTrade.

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, User, ArrowRight, Eye, EyeOff, Check, ChevronRight,
  Shield, ArrowLeft, KeyRound
} from 'lucide-react';
import { toast } from 'sonner';
import NeotradeNavbar from './NeotradeNavbar';
import { api, setToken, setStoredUser } from '@/lib/api';

// Slide to Verify Component — verbatim port from NeoTrade
const SlideToVerify = ({ onVerified, verified }) => {
  const [sliderPos, setSliderPos] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);
  const containerRef = useRef(null);

  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDrag = (e) => {
    if (!isDragging || verified) return;
    const container = containerRef.current;
    const slider = sliderRef.current;
    if (!container || !slider) return;
    const containerRect = container.getBoundingClientRect();
    const sliderWidth = slider.offsetWidth;
    const maxPos = containerRect.width - sliderWidth - 8;
    let clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    let newPos = clientX - containerRect.left - sliderWidth / 2;
    newPos = Math.max(0, Math.min(newPos, maxPos));
    setSliderPos(newPos);
    if (newPos >= maxPos - 5) {
      setSliderPos(maxPos);
      setIsDragging(false);
      onVerified(true);
    }
  };

  const handleDragEnd = () => {
    if (!verified) setSliderPos(0);
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (!verified) {
      const container = containerRef.current;
      const slider = sliderRef.current;
      if (container && slider) {
        const maxPos = container.offsetWidth - slider.offsetWidth - 8;
        setSliderPos(maxPos);
        onVerified(true);
      }
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => handleDrag(e);
    const handleMouseUp = () => handleDragEnd();
    const handleTouchMove = (e) => handleDrag(e);
    const handleTouchEnd = () => handleDragEnd();
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, verified]);

  return (
    <div
      ref={containerRef}
      className={`relative h-12 rounded-lg overflow-hidden select-none ${
        verified ? 'bg-neon/20 border border-neon/30' : 'bg-space-light border border-white/10'
      }`}
      data-testid="slide-verify"
      onDoubleClick={handleDoubleClick}
    >
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-electric/30 to-neon/30 transition-all"
        style={{ width: verified ? '100%' : `${sliderPos + 44}px` }}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {verified ? (
          <span className="text-sm text-neon font-medium flex items-center gap-2">
            <Check className="w-4 h-4" /> Verified
          </span>
        ) : (
          <span className="text-sm text-gray-400 flex items-center gap-1">
            Slide to verify <ChevronRight className="w-4 h-4" />
          </span>
        )}
      </div>
      <div
        ref={sliderRef}
        data-testid="slider-handle"
        className={`absolute top-1 left-1 bottom-1 w-10 rounded-md flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors ${
          verified ? 'bg-neon text-space' : 'bg-white/10 text-white hover:bg-white/20'
        }`}
        style={{ transform: `translateX(${sliderPos}px)` }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        {verified ? <Check className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
      </div>
    </div>
  );
};

export default function NeotradeAuth({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgot' | 'reset'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', full_name: '',
    resetCode: '', newPassword: ''
  });

  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams?.get('ref');

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setVerified(false);
    setTermsAccepted(false);
    setResetToken('');
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!formData.email) { toast.error('Enter your email'); return; }
    setLoading(true);
    try {
      await api.passwordRequest(formData.email);
      toast.success('If the email exists, a reset code has been sent. Check your inbox.');
      setMode('reset');
    } catch (err) {
      toast.error(err.message || 'Failed to process request');
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!formData.resetCode || !formData.newPassword) {
      toast.error('Enter reset code and new password');
      return;
    }
    if (formData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await api.passwordReset(formData.email, formData.resetCode, formData.newPassword);
      toast.success('Password reset successfully! Please login.');
      handleModeSwitch('login');
      setFormData({ ...formData, resetCode: '', newPassword: '' });
    } catch (err) {
      toast.error(err.message || 'Invalid or expired reset code');
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!verified) { toast.error('Please complete the verification slider'); return; }

    if (mode === 'register') {
      if (!termsAccepted) { toast.error('Please accept the Terms of Service'); return; }
      if (formData.password !== formData.confirmPassword) { toast.error('Passwords do not match'); return; }
      if (formData.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const r = await api.login(formData.email, formData.password);
        setToken(r.token); setStoredUser(r.user);
        toast.success(`Welcome back, ${r.user?.name || 'trader'}!`);
        router.push(r.user?.role === 'admin' ? '/admin' : '/trade');
      } else {
        const r = await api.signup(formData.email, formData.password, formData.full_name, referralCode || undefined);
        if (r?.token) { setToken(r.token); setStoredUser(r.user); }
        toast.success('Account created! Welcome to NEOTRADE!');
        router.push(r?.user?.role === 'admin' ? '/admin' : '/trade');
      }
    } catch (error) {
      toast.error(error.message || 'An error occurred');
    } finally { setLoading(false); }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  // ─── Forgot Password Form ───
  if (mode === 'forgot') {
    return (
      <div className="min-h-screen flex flex-col neo-page bg-app text-white">
        <NeotradeNavbar />
        <section className="flex-grow flex items-center justify-center px-4 py-20">
          <motion.div className="w-full max-w-md glass-panel rounded-2xl p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => handleModeSwitch('login')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6" data-testid="forgot-back">
              <ArrowLeft className="w-4 h-4" /> Back to login
            </button>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-electric/10 flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-7 h-7 text-electric" />
              </div>
              <h2 className="text-xl font-bold text-white">Forgot Password</h2>
              <p className="text-sm text-gray-500 mt-1">Enter your email to receive a reset code</p>
            </div>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 ml-1 block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="email" name="email" value={formData.email} onChange={handleChange}
                    className="input-field pl-9" placeholder="name@example.com" required data-testid="forgot-email" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-electric to-neon text-space font-semibold text-sm hover:shadow-[0_0_20px_rgba(42,245,255,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="forgot-submit">
                {loading ? <div className="w-5 h-5 border-2 border-space border-t-transparent rounded-full animate-spin" /> : <>Send Reset Code<ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </motion.div>
        </section>
      </div>
    );
  }

  // ─── Reset Password Form ───
  if (mode === 'reset') {
    return (
      <div className="min-h-screen flex flex-col neo-page bg-app text-white">
        <NeotradeNavbar />
        <section className="flex-grow flex items-center justify-center px-4 py-20">
          <motion.div className="w-full max-w-md glass-panel rounded-2xl p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => handleModeSwitch('login')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6" data-testid="reset-back">
              <ArrowLeft className="w-4 h-4" /> Back to login
            </button>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-neon/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-neon" />
              </div>
              <h2 className="text-xl font-bold text-white">Reset Password</h2>
              <p className="text-sm text-gray-500 mt-1">Enter the code and your new password</p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 ml-1 block mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="email" name="email" value={formData.email} onChange={handleChange}
                    className="input-field pl-9" placeholder="name@example.com" required data-testid="reset-email" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 ml-1 block mb-1">Reset Code</label>
                <input type="text" name="resetCode" value={formData.resetCode} onChange={handleChange}
                  className="input-field font-mono tracking-wider text-center" placeholder="Enter 6-digit code" required data-testid="reset-code" />
              </div>
              <div>
                <label className="text-xs text-gray-400 ml-1 block mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type={showPassword ? 'text' : 'password'} name="newPassword" value={formData.newPassword} onChange={handleChange}
                    className="input-field pl-9 pr-10" placeholder="Min 6 characters" required minLength={6} data-testid="new-password" />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-electric to-neon text-space font-semibold text-sm hover:shadow-[0_0_20px_rgba(42,245,255,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="reset-submit">
                {loading ? <div className="w-5 h-5 border-2 border-space border-t-transparent rounded-full animate-spin" /> : <>Reset Password<ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </motion.div>
        </section>
      </div>
    );
  }

  // ─── Main Login / Register Form (NeoTrade tab switcher) ───
  const isLogin = mode === 'login';
  return (
    <div className="min-h-screen flex flex-col neo-page bg-app text-white">
      <NeotradeNavbar />
      <section className="flex-grow flex items-center justify-center px-4 relative py-20">
        <div className="absolute inset-0 pointer-events-none overflow-hidden perspective-1000">
          <motion.div className="absolute top-[20%] left-[20%] w-32 h-32 bg-vibrant/20 backdrop-blur-xl rounded-2xl"
            style={{ transform: 'rotate(12deg)' }} animate={{ y: [0, -20, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute bottom-[20%] right-[20%] w-24 h-24 bg-electric/20 backdrop-blur-xl rounded-full"
            animate={{ y: [0, -15, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }} />
        </div>

        <motion.div className="w-full max-w-md glass-panel rounded-2xl p-8 relative z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {referralCode && (
            <div className="mb-4 p-3 rounded-lg bg-electric/10 border border-electric/20">
              <p className="text-xs text-electric text-center">Referred by: <span className="font-mono font-bold">{referralCode}</span></p>
            </div>
          )}

          <div className="flex p-1 bg-space-light rounded-lg mb-8 border border-white/5">
            <button className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isLogin ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              onClick={() => handleModeSwitch('login')} data-testid="login-tab">Sign In</button>
            <button className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isLogin ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              onClick={() => handleModeSwitch('register')} data-testid="register-tab">Sign Up</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div className="space-y-1" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <label className="text-xs text-gray-400 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="text" name="full_name" value={formData.full_name} onChange={handleChange}
                      className="input-field pl-9" placeholder="John Doe" required={!isLogin} data-testid="fullname-input" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              <label className="text-xs text-gray-400 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  className="input-field pl-9" placeholder="name@example.com" required data-testid="email-input" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs text-gray-400">Password</label>
                {isLogin && (
                  <button type="button" onClick={() => handleModeSwitch('forgot')} className="text-xs text-electric hover:text-neon transition-colors" data-testid="forgot-link">Forgot?</button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                  className="input-field pl-9 pr-10" placeholder="Min 6 characters" required minLength={6} data-testid="password-input" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div className="space-y-1" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <label className="text-xs text-gray-400 ml-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                      className={`input-field pl-9 pr-10 ${formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-vibrant' : formData.confirmPassword && formData.password === formData.confirmPassword ? 'border-neon/50' : ''}`}
                      placeholder="Repeat password" required={!isLogin} data-testid="confirm-password-input" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                    <p className="text-xs text-vibrant ml-1">Passwords do not match</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div className="pt-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="sr-only" data-testid="terms-checkbox" />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${termsAccepted ? 'bg-neon border-neon' : 'border-white/20 group-hover:border-white/40'}`}>
                        {termsAccepted && <Check className="w-3 h-3 text-space" />}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 leading-relaxed">
                      I agree to the <a href="/legal/terms" className="text-electric hover:text-neon">Terms of Service</a>, <a href="/legal/privacy" className="text-electric hover:text-neon">Privacy Policy</a>, and <a href="/legal/risk" className="text-electric hover:text-neon">Risk Disclosure</a>.
                    </span>
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-2">
              <SlideToVerify verified={verified} onVerified={setVerified} />
            </div>

            <button type="submit" disabled={loading || !verified || (!isLogin && !termsAccepted)}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-electric to-neon text-space font-semibold text-sm hover:shadow-[0_0_20px_rgba(42,245,255,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              data-testid="submit-btn">
              {loading ? <div className="w-5 h-5 border-2 border-space border-t-transparent rounded-full animate-spin" /> : <>{isLogin ? 'Access Platform' : 'Create Account'}<ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {isLogin && <p className="mt-6 text-xs text-gray-500 text-center">By signing in, you agree to our Terms of Service and Risk Disclosure.</p>}
        </motion.div>
      </section>
    </div>
  );
}
