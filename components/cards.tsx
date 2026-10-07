'use client';

import React from 'react';
import { motion } from 'motion/react';

interface CardShellProps {
  index?: number | string;
  total?: number | string;
  category?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function CardShell({
  index,
  total,
  category,
  children,
  footer,
}: CardShellProps) {
  const indexStr =
    typeof index === 'number' ? String(index).padStart(2, '0') : index;
  const totalStr =
    typeof total === 'number' ? String(total).padStart(2, '0') : total;

  return (
    <div className="relative w-full max-w-lg mx-auto flex flex-col justify-between min-h-[560px] sm:min-h-[620px] p-8 sm:p-12 rounded-2xl bg-[#080808] border border-zinc-800/80 shadow-none">
      {/* Tiny Consistent Header */}
      <div className="flex items-center justify-between text-[11px] font-mono tracking-widest text-zinc-500 uppercase pb-6 border-b border-zinc-900 select-none">
        <div>
          {indexStr && totalStr ? (
            <span className="text-zinc-400 font-semibold">{indexStr} / {totalStr}</span>
          ) : (
            <span>{category || 'REPORT'}</span>
          )}
        </div>
        <div className="text-zinc-600 font-medium">ONCHAIN WRAPPED</div>
      </div>

      {/* Main Content: Big Idea */}
      <div className="flex-1 flex flex-col justify-center py-8 my-auto">
        {children}
      </div>

      {/* Subtle Footer */}
      {footer ? (
        <div className="pt-6 border-t border-zinc-900">{footer}</div>
      ) : (
        <div className="pt-6 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono text-zinc-600 select-none uppercase tracking-wider">
          <span>BASE</span>
          <span>VERIFIED ONCHAIN</span>
        </div>
      )}
    </div>
  );
}

export function CardMotionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="w-full flex justify-center"
    >
      {children}
    </motion.div>
  );
}
