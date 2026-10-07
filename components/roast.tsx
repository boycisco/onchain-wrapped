'use client';

import React from 'react';
import { motion } from 'motion/react';
import { RoastData } from '@/lib/types';
import { CardShell, CardMotionWrapper } from './cards';

interface RoastCardProps {
  data: RoastData;
  index?: number;
  total?: number;
}

export function RoastCard({ data, index = 6, total = 6 }: RoastCardProps) {
  return (
    <CardMotionWrapper>
      <CardShell index={index} total={total}>
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-1"
          >
            <p className="text-xs font-mono tracking-[0.25em] uppercase text-zinc-500 font-semibold">
              UNFILTERED
            </p>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-400">
              YOUR WALLET HAS SOMETHING TO SAY.
            </h2>
          </motion.div>

          {/* Big Roast Typography */}
          <div className="space-y-4 pt-2">
            {data.lines.map((line, idx) => (
              <motion.blockquote
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.28 + idx * 0.2,
                  duration: 0.4,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="text-xl sm:text-2xl md:text-3xl font-serif italic text-white leading-snug text-balance"
              >
                &ldquo;{line}&rdquo;
              </motion.blockquote>
            ))}
          </div>
        </div>
      </CardShell>
    </CardMotionWrapper>
  );
}
