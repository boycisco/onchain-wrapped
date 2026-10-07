'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { RangeOption, WrappedData } from '@/lib/types';
import { getWrapped, WrappedApiError } from '@/lib/api';
import { getFriendlyErrorMessage } from '@/lib/format';
import { Hero } from '@/components/hero';
import { LoadingExperience } from '@/components/loading';
import { WrappedExperience } from '@/components/wrapped';

function PageContent() {
  const searchParams = useSearchParams();

  const urlRange = searchParams.get('range') as RangeOption | null;
  const initialRange: RangeOption =
    urlRange && ['year', 'last90', 'last30', 'all'].includes(urlRange) ? urlRange : 'year';

  const [wallet, setWallet] = useState(() => searchParams.get('wallet') || '');
  const [range, setRange] = useState<RangeOption>(initialRange);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrappedData, setWrappedData] = useState<WrappedData | null>(null);

  const loadWrapped = useCallback(
    async (targetWallet: string, targetRange: RangeOption) => {
      const clean = targetWallet.trim();
      if (!clean) {
        setError('Please enter a Base wallet address.');
        return;
      }
      if (!clean.startsWith('0x') || clean.length !== 42) {
        setError("That doesn't look like a valid Base wallet. Check the address and try again.");
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await getWrapped(clean, targetRange);
        setWrappedData(res.wrapped);

        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('wallet', clean);
          url.searchParams.set('range', targetRange);
          window.history.replaceState({}, '', url.toString());
        }
      } catch (err: unknown) {
        if (err instanceof WrappedApiError) {
          setError(getFriendlyErrorMessage(err.code, err.message));
        } else {
          setError('Something went sideways while building your Wrapped. Try again.');
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Auto-load once on mount if a wallet is supplied via searchParams.
  // Guarded by a ref because useSearchParams() returns a new object on every
  // render, which would otherwise re-fire this effect in an infinite loop.
  const autoLoadedRef = useRef(false);
  useEffect(() => {
    if (autoLoadedRef.current) return;
    const initialWallet = searchParams.get('wallet');
    if (initialWallet && initialWallet.startsWith('0x') && initialWallet.length === 42) {
      autoLoadedRef.current = true;
      void loadWrapped(initialWallet, initialRange);
    }
  }, [loadWrapped, searchParams, initialRange]);

  const handleSubmit = () => {
    loadWrapped(wallet, range);
  };

  const handleExit = () => {
    setWrappedData(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('wallet');
      url.searchParams.delete('range');
      window.history.replaceState({}, '', url.toString());
    }
  };

  if (isLoading) {
    return <LoadingExperience wallet={wallet} onCancel={() => setIsLoading(false)} />;
  }

  if (wrappedData) {
    return <WrappedExperience wrapped={wrappedData} range={range} onExit={handleExit} />;
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-zinc-800 selection:text-white">
      <header className="w-full border-b border-zinc-900 bg-black/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="text-xs font-mono font-bold tracking-[0.2em] text-white hover:text-zinc-400 transition-colors uppercase"
          >
            ONCHAIN WRAPPED
          </Link>
          <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">
            BASE
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center">
        <Hero
          wallet={wallet}
          onWalletChange={(val) => {
            setWallet(val);
            if (error) setError(null);
          }}
          range={range}
          onRangeChange={(r) => setRange(r)}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
        />
      </main>

      <footer className="w-full border-t border-zinc-900 py-6 text-center text-[10px] font-mono tracking-widest text-zinc-600 uppercase">
        BASE / ONCHAIN WRAPPED
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <PageContent />
    </Suspense>
  );
}