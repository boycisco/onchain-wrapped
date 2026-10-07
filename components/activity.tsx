'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ActivityData } from '@/lib/types';
import { formatNumber, formatDate } from '@/lib/format';
import { CardShell, CardMotionWrapper } from './cards';

interface ActivityCardProps {
  data: ActivityData;
  index?: number;
  total?: number;
}

export function ActivityCard({ data, index = 1, total = 6 }: ActivityCardProps) {
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
            YOU MADE
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.18, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-1"
          >
            <div className="text-6xl sm:text-7xl md:text-8xl font-black font-mono tracking-tighter text-white leading-none tabular-nums">
              {formatNumber(data.transactions)}
            </div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
              MOVES.
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="pt-4 space-y-1"
          >
            <p className="text-sm sm:text-base font-mono text-zinc-400">
              across {data.activeDays} active days
            </p>
            {data.busiestDay && (
              <p className="text-xs font-mono text-zinc-600">
                busiest day was {formatDate(data.busiestDay)}
              </p>
            )}
          </motion.div>
        </div>
      </CardShell>
    </CardMotionWrapper>
  );
}
