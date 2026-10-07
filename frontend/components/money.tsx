'use client';

import React from 'react';
import { motion } from 'motion/react';
import { MoneyData } from '@/lib/types';
import { formatAmount } from '@/lib/format';
import { CardShell, CardMotionWrapper } from './cards';

interface MoneyCardProps {
  data: MoneyData;
  index?: number;
  total?: number;
}

export function MoneyCard({ data, index = 4, total = 6 }: MoneyCardProps) {
  return (
    <CardMotionWrapper>
      <CardShell index={index} total={total}>
        <div className="space-y-6">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xs font-mono tracking-[0.25em] uppercase text-zinc-500 font-semibold"
          >
            VALUE MOVED
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.18, duration: 0.4 }}
            className="space-y-2"
          >
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              YOU SENT
            </p>
            <div className="text-5xl sm:text-6xl md:text-7xl font-black font-mono tracking-tighter text-white tabular-nums">
              {formatAmount(data.nativeSent, 'ETH')}
            </div>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
              native volume
            </p>
          </motion.div>

          {data.topToken && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.32 }}
              className="pt-4 border-t border-zinc-900 space-y-1"
            >
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
                FAVORITE ASSET
              </p>
              <p className="text-lg font-mono font-bold text-white tracking-wide">
                {data.topToken}
              </p>
            </motion.div>
          )}
        </div>
      </CardShell>
    </CardMotionWrapper>
  );
}
