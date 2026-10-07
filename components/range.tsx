'use client';

import React from 'react';
import { RangeOption } from '@/lib/types';

interface RangeProps {
  value: RangeOption;
  onChange: (range: RangeOption) => void;
  disabled?: boolean;
}

const RANGES: { id: RangeOption; label: string }[] = [
  { id: 'year', label: 'THIS YEAR' },
  { id: 'last90', label: '90 DAYS' },
  { id: 'last30', label: '30 DAYS' },
  { id: 'all', label: 'ALL TIME' },
];

export function RangeSelector({ value, onChange, disabled }: RangeProps) {
  return (
    <div
      role="group"
      aria-label="Timeframe range selector"
      className="inline-flex items-center gap-1 p-1 bg-black border border-zinc-800 rounded-lg"
    >
      {RANGES.map((range) => {
        const isActive = value === range.id;
        return (
          <button
            key={range.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(range.id)}
            className={`px-3 py-1.5 text-[11px] font-mono tracking-wider transition-colors duration-150 rounded whitespace-nowrap min-h-[32px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:opacity-40 ${
              isActive
                ? 'bg-zinc-900 text-white font-semibold border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
            }`}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
