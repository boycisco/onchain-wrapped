'use client';

import React from 'react';
import { motion } from 'motion/react';
import { RangeOption } from '@/lib/types';
import { RangeSelector } from './range';
import { WalletInput } from './input';

interface HeroProps {
  wallet: string;
  onWalletChange: (val: string) => void;
  range: RangeOption;
  onRangeChange: (val: RangeOption) => void;
  onSubmit: () => void;
  isLoading: boolean;
  error: string | null;
}

export function Hero({
  wallet,
  onWalletChange,
  range,
  onRangeChange,
  onSubmit,
  isLoading,
  error,
}: HeroProps) {
  return (
    <section className="relative w-full min-h-[calc(100vh-140px)] flex flex-col items-center justify-center px-4 sm:px-6 py-16">
      <div className="w-full max-w-2xl mx-auto text-center space-y-8 sm:space-y-10">
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="text-xs font-mono tracking-[0.25em] uppercase text-zinc-500"
        >
          ONCHAIN WRAPPED
        </motion.p>

        {/* Main Title & Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="space-y-3"
        >
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white leading-[0.95] uppercase">
            YOUR WALLET
            <br />
            HAS A STORY.
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 font-normal tracking-wide">
            See what you did on Base.
          </p>
        </motion.div>

        {/* Input & Action */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="pt-2"
        >
          <WalletInput
            value={wallet}
            onChange={onWalletChange}
            onSubmit={onSubmit}
            isLoading={isLoading}
            error={error}
          />
        </motion.div>

        {/* Range Selector */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="flex justify-center pt-2"
        >
          <RangeSelector value={range} onChange={onRangeChange} disabled={isLoading} />
        </motion.div>
      </div>
    </section>
  );
}
