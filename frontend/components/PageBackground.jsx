'use client';

// Ported verbatim from NEOTRADE/frontend/src/components/PageBackground.js
const PageBackground = () => (
  <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand/[0.04] rounded-full blur-[150px]" />
    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-buy/[0.03] rounded-full blur-[130px]" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-brand/[0.02] rounded-full blur-[120px]" />
  </div>
);

export default PageBackground;
