'use client';

import React from 'react';
import { motion } from 'motion/react';
import { TimingData } from '@/lib/types';
import { formatHour, formatPercent } from '@/lib/format';
import { CardShell, CardMotionWrapper } from './cards';

interface TimingCardProps {
  data: TimingData;
  index?: number;
  total?: number;
}

export function TimingCard({ data, index = 3, total = 6 }: TimingCardProps) {
  const isNight = data.nightFraction >= 0.45 || data.busiestHour >= 22 || data.busiestHour <= 4;
  const isEarly = data.busiestHour >= 5 && data.busiestHour < 12;

  let headline = 'DAYLIGHT\nRHYTHM.';
  if (isNight) headline = "YOU DON'T\nSLEEP.";
  else if (isEarly) headline = 'EARLY\nHOURS.';

  return (
    <CardMotionWrapper>
      <CardShell index={index} total={total}>
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="space-y-2"
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-white leading-[0.95] whitespace-pre-line">
              {headline}
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.22, duration: 0.4 }}
            className="space-y-1"
          >
            <div className="text-4xl sm:text-5xl font-mono font-bold text-white tracking-tight tabular-nums">
              {formatHour(data.busiestHour)}
            </div>
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
              was your busiest hour.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="pt-2 text-xs font-mono text-zinc-500"
          >
            <span>Night activity: {formatPercent(data.nightFraction)}</span>
          </motion.div>
        </div>
      </CardShell>
    </CardMotionWrapper>
  );
}
