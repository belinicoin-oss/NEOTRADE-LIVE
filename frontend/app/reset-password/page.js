'use client';
import { Suspense } from 'react';
import NeotradeAuth from '@/components/NeotradeAuth';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-app" />}>
      <NeotradeAuth initialMode="forgot" />
    </Suspense>
  );
}
