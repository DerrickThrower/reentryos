'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createBrowserClient();
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInErr) throw new Error(signInErr.message);

      router.push('/dashboard');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] border border-[#1a1a1a] bg-[#111111] p-8 space-y-6">
        {/* Branding */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <img
              src="/logo.png"
              alt="ReEntryOS Logo"
              className="h-16 w-auto rounded-sm object-contain"
            />
          </div>
          <div className="space-y-1">
            <h1 className="font-mono text-[24px] tracking-[0.2em] text-white uppercase">
              <span className="font-light">RE</span>
              <span className="text-gray-500 font-extralight mx-0.5">—</span>
              <span className="font-bold">ENTRY</span>
              <span className="text-[#3b82f6] font-extrabold ml-0.5">OS</span>
            </h1>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#6b7280] uppercase">
              Case Coordination System
            </p>
          </div>
        </div>

        {/* Status Error Display */}
        {error && (
          <div className="bg-[#ef4444]/15 border border-[#ef4444] p-3 text-center animate-shake">
            <p className="font-mono text-[11px] text-[#ef4444] uppercase font-bold tracking-wider leading-relaxed">
              {error}
            </p>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1">
            <label className="font-mono text-[10px] tracking-[0.2em] text-[#6b7280] block uppercase font-bold">
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="operator@reentryos.org"
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white font-mono text-[12px] px-3.5 py-2.5 focus:outline-none focus:border-[#3b82f6] placeholder-[#4b5563] transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="font-mono text-[10px] tracking-[0.2em] text-[#6b7280] block uppercase font-bold">
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="••••••••••••"
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white font-mono text-[12px] px-3.5 py-2.5 focus:outline-none focus:border-[#3b82f6] placeholder-[#4b5563] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full font-mono text-[11px] tracking-[0.2em] font-bold py-3.5 bg-[#3b82f6] text-white hover:bg-blue-600 active:bg-blue-700 transition-colors disabled:opacity-50 uppercase"
          >
            {loading ? 'AUTHENTICATING...' : 'SIGN IN'}
          </button>
        </form>

        {/* Bypass / Demo Link */}
        <div className="pt-4 border-t border-[#1a1a1a] text-center space-y-2">
          <Link
            href="/dashboard"
            className="font-mono text-[11px] tracking-[0.15em] text-[#3b82f6] hover:text-blue-400 active:text-blue-500 font-bold transition-colors uppercase block"
          >
            Demo mode — skip login →
          </Link>
          <p className="font-mono text-[9px] text-[#4b5563] uppercase tracking-wide">
            Skip authentication for demo purposes
          </p>
        </div>
      </div>
    </main>
  );
}
