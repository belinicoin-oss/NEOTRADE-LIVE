'use client';

// Ported from NEOTRADE/frontend/src/components/Navbar.js — public marketing nav only.
// Adapted for Next.js App Router (react-router → next/link + usePathname).
// The trading dashboard has its own internal navigation (TradingLiteLogo header in /trade, /admin, /account etc.).

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';

// NEOTRADE Logo — Hex-framed "N" made of trading candles with tricolor gradient
export const NeotradeLogo = ({ size = 'default' }) => {
  const sizes = { small: 'w-7 h-7', default: 'w-9 h-9', large: 'w-14 h-14' };
  const cls = sizes[size] || sizes.default;
  return (
    <div className={`${cls} relative flex items-center justify-center`}>
      <svg viewBox="0 0 48 48" className="w-full h-full" aria-label="NEOTRADE logo" data-testid="neotrade-logo">
        <path d="M24 2 L42 12 L42 36 L24 46 L6 36 L6 12 Z" fill="url(#neoHexFill)" opacity="0.18" />
        <path d="M24 2 L42 12 L42 36 L24 46 L6 36 L6 12 Z" fill="none" stroke="url(#neoGradient)" strokeWidth="2" strokeLinejoin="round" />
        <rect x="14" y="14" width="4" height="20" rx="1.5" fill="url(#neoGradient)" />
        <rect x="30" y="14" width="4" height="20" rx="1.5" fill="url(#neoGradient)" />
        <path d="M18 16 L30 32" stroke="url(#neoGradient)" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="34" cy="14" r="2.2" fill="#EC4899">
          <animate attributeName="opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />
          <animate attributeName="r" values="2.2;2.8;2.2" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <circle cx="14" cy="34" r="1.6" fill="#22D3EE">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2.2s" repeatCount="indefinite" />
        </circle>
        <defs>
          <linearGradient id="neoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
          <linearGradient id="neoHexFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export const NeotradeWordmark = ({ className = '' }) => (
  <span className={`font-bold tracking-tight ${className}`}>
    <span className="text-gradient-brand">NEO</span>
    <span className="text-white">TRADE</span>
  </span>
);

export default function NeotradeNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hide auth buttons when already on auth pages
  const onAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/reset-password';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-app/95 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2" data-testid="logo">
            <NeotradeLogo />
            <NeotradeWordmark className="text-lg" />
          </Link>

          <div className="flex items-center gap-3">
            {!onAuthPage && (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
                  data-testid="login-link"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 rounded-lg bg-gradient-brand text-white text-sm font-semibold hover:shadow-[0_0_20px_rgba(139,92,246,0.45)] transition-all whitespace-nowrap"
                  data-testid="signup-link"
                >
                  Get Started
                </Link>
              </div>
            )}

            {!onAuthPage && (
              <button
                className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5"
                onClick={() => setMenuOpen(!menuOpen)}
                data-testid="mobile-menu"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-panel border-b border-white/10 p-4 animate-in">
          <div className="flex flex-col gap-2">
            <Link href="/signup" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-lg text-white text-center font-medium bg-gradient-brand">
              Get Started
            </Link>
            <Link href="/login" onClick={() => setMenuOpen(false)} className="px-4 py-3 rounded-lg text-gray-300 text-center font-medium bg-white/5 hover:bg-white/10">
              Login
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
