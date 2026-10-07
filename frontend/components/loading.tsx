'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatAddress } from '@/lib/format';

interface LoadingProps {
  wallet: string;
  onCancel?: () => void;
}

const STAGES = [
  'Finding your onchain history...',
  'Studying your habits...',
  'Figuring out what kind of degen you are...',
  'Preparing your report...',
];

export function LoadingExperience({ wallet, onCancel }: LoadingProps) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % STAGES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="w-full max-w-sm mx-auto space-y-6 flex flex-col items-center">
        {/* Address and status */}
        <div className="space-y-1">
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-600">
            BASE WALLET
          </p>
          <p className="font-mono text-sm text-zinc-300">
            {formatAddress(wallet, 6, 6)}
          </p>
        </div>

        {/* Multi-stage intentional message */}
        <div className="h-12 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={stageIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="text-base sm:text-lg text-white font-medium tracking-tight text-balance"
            >
              {STAGES[stageIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Minimal hairline progress indicator */}
        <div className="w-36 h-0.5 bg-zinc-900 rounded-full overflow-hidden relative">
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-0 bottom-0 w-1/2 bg-white"
          />
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors pt-4 uppercase tracking-wider"
          >
            CANCEL
          </button>
        )}
      </div>
    </div>
  );
}
