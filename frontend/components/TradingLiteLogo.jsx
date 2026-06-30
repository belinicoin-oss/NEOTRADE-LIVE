'use client';

// Brand mark for NEOTRADE — dashboard header.
//   Shape : Hexagonal fintech tile with vertical candle pillars and a bullish
//           diagonal slash + arrowhead. (Shape preserved from prior engine
//           logo — no layout/structural changes.)
//   Word  : "NEO" in soft white, "TRADE" in NeoTrade tricolor gradient
//           (cyan → violet → pink) to harmonise with the landing brand.
export default function NeoTradeLogo({ className = '', compact = false, iconOnly = false }) {
  const tileSize = compact ? 28 : 36;
  const txtSize = compact ? 'text-sm' : 'text-xl';

  return (
    <div className={`flex items-center gap-2 select-none ${className}`} data-testid="brand-logo">
      <BrandMark size={tileSize} />
      {!iconOnly && (
        <div className={`font-extrabold tracking-tight ${txtSize} flex items-baseline leading-none`}>
          <span className="text-white">NEO</span>
          <span
            className="ml-0.5 text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(135deg,#22D3EE 0%,#8B5CF6 50%,#EC4899 100%)' }}
          >
            TRADE
          </span>
        </div>
      )}
    </div>
  );
}

export function BrandMark({ size = 36 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-label="NEOTRADE"
    >
      <defs>
        <linearGradient id="ntx-tile" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0f1a24" />
          <stop offset="100%" stopColor="#060a0f" />
        </linearGradient>
        <linearGradient id="ntx-brand" x1="0" y1="40" x2="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
        <linearGradient id="ntx-slash" x1="8" y1="30" x2="32" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
        <filter id="ntx-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="0.9" />
        </filter>
      </defs>

      {/* Hexagonal tile (rounded) — fintech signature shape */}
      <path
        d="M20 2 L35.5 10 L35.5 30 L20 38 L4.5 30 L4.5 10 Z"
        fill="url(#ntx-tile)"
        stroke="#8B5CF6"
        strokeOpacity="0.45"
        strokeWidth="0.8"
      />

      {/* Left vertical pillar (N left stroke) + small wick */}
      <line x1="12" y1="6" x2="12" y2="34" stroke="#2b3a4c" strokeWidth="0.8" strokeLinecap="round" />
      <rect x="10.8" y="13" width="2.4" height="14" rx="0.6" fill="url(#ntx-brand)" />

      {/* Right vertical pillar (N right stroke) — taller = progression */}
      <line x1="28" y1="4" x2="28" y2="36" stroke="#2b3a4c" strokeWidth="0.8" strokeLinecap="round" />
      <rect x="26.8" y="9" width="2.4" height="18" rx="0.6" fill="url(#ntx-brand)" />

      {/* Diagonal — forms the "N" bar AND an upward arrow (bullish) */}
      <path
        d="M10 28 L30 12"
        stroke="url(#ntx-slash)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
        filter="url(#ntx-glow)"
      />
      <path
        d="M10 28 L30 12"
        stroke="#22D3EE"
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
      {/* Arrowhead top-right */}
      <path
        d="M30 12 L30 17 M30 12 L25 12"
        stroke="#EC4899"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Entry dot (bottom-left anchor) */}
      <circle cx="10" cy="28" r="1.6" fill="#22D3EE" />
    </svg>
  );
}
