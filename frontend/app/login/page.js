'use client';
import { Suspense } from 'react';
import NeotradeAuth from '@/components/NeotradeAuth';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-app" />}>
      <NeotradeAuth initialMode="login" />
    </Suspense>
  );
}
