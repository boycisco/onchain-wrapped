'use client';

import React from 'react';
import { motion } from 'motion/react';
import { AddressesData } from '@/lib/types';
import { formatNumber, formatAddress } from '@/lib/format';
import { CardShell, CardMotionWrapper } from './cards';

interface AddressesCardProps {
  data: AddressesData;
  index?: number;
  total?: number;
}

export function AddressesCard({ data, index = 5, total = 6 }: AddressesCardProps) {
  const topCounterparty = data.top && data.top.length > 0 ? data.top[0] : null;

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
            EXPLORATION
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.18, duration: 0.4 }}
            className="space-y-1"
          >
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-400">
              YOU MET
            </p>
            <div className="text-6xl sm:text-7xl md:text-8xl font-black font-mono tracking-tighter text-white leading-none tabular-nums">
              {formatNumber(data.uniqueAddresses)}
            </div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
              ADDRESSES.
            </div>
          </motion.div>

          {topCounterparty && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.32 }}
              className="pt-4 border-t border-zinc-900 space-y-1"
            >
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
                MOST FREQUENTED
              </p>
              <p className="text-sm font-mono text-zinc-300">
                {topCounterparty.label || formatAddress(topCounterparty.address, 6, 6)}
              </p>
            </motion.div>
          )}
        </div>
      </CardShell>
    </CardMotionWrapper>
  );
}
