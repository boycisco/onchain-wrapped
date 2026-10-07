'use client';

import React from 'react';
import { motion } from 'motion/react';
import { IdentityData } from '@/lib/types';
import { CardShell, CardMotionWrapper } from './cards';

interface IdentityCardProps {
  data: IdentityData;
  index?: number;
  total?: number;
}

export function IdentityCard({ data, index = 2, total = 6 }: IdentityCardProps) {
  // Split identity words for sequential reveal
  const words = data.name.split(' ');

  return (
    <CardMotionWrapper>
      <CardShell index={index} total={total}>
        <div className="space-y-8">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xs font-mono tracking-[0.25em] uppercase text-zinc-500 font-semibold"
          >
            YOUR ONCHAIN TYPE
          </motion.p>

          {/* Sequential word-by-word reveal */}
          <div className="space-y-1">
            <h2 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight text-white leading-[0.95] text-balance">
              {words.map((word, idx) => (
                <motion.span
                  key={idx}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.25 + idx * 0.22,
                    duration: 0.35,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="inline-block mr-3"
                >
                  {word}
                </motion.span>
              ))}
            </h2>
          </div>

          {/* Score & subtle traits */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 + words.length * 0.22 + 0.15 }}
            className="pt-4 space-y-4"
          >
            <div className="flex items-baseline gap-2 font-mono">
              <span className="text-xl font-bold text-white tabular-nums">{data.score}</span>
              <span className="text-xs text-zinc-600">/ 100</span>
            </div>

            {data.traits && data.traits.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                {data.traits.map((trait, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-zinc-700">·</span>}
                    <span>{trait}</span>
                  </React.Fragment>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </CardShell>
    </CardMotionWrapper>
  );
}
