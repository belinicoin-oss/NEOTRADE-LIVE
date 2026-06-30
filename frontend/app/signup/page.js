'use client';
import { Suspense } from 'react';
import NeotradeAuth from '@/components/NeotradeAuth';

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-app" />}>
      <NeotradeAuth initialMode="register" />
    </Suspense>
  );
}
