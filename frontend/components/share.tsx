'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { WrappedData } from '@/lib/types';
import { formatAddress, formatNumber } from '@/lib/format';
import { Share2, Swords, RefreshCw, Check } from 'lucide-react';

interface ShareProps {
  data: WrappedData;
  onOpenCompare: () => void;
  onRestart: () => void;
}

export function ShareSummaryCard({ data, onOpenCompare, onRestart }: ShareProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  const shareText = `My Base Onchain Wrapped: ${data.identity.name} (${data.identity.score}/100) — ${formatNumber(data.activity.transactions)} moves across ${data.activity.activeDays} days.`;

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const url = `${window.location.origin}${window.location.pathname}?wallet=${encodeURIComponent(data.wallet)}&range=${encodeURIComponent(data.range)}`;
        await navigator.share({
          title: 'Onchain Wrapped',
          text: shareText,
          url,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    if (typeof window !== 'undefined' && navigator.clipboard) {
      const url = `${window.location.origin}${window.location.pathname}?wallet=${encodeURIComponent(data.wallet)}&range=${encodeURIComponent(data.range)}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      {/* Poster Summary */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="p-8 sm:p-12 rounded-2xl bg-[#080808] border border-zinc-800 space-y-8 select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between text-[11px] font-mono tracking-widest text-zinc-500 uppercase pb-6 border-b border-zinc-900">
          <span className="text-zinc-400 font-semibold">ONCHAIN WRAPPED</span>
          <span>{data.range === 'year' ? '2026' : data.range.toUpperCase()}</span>
        </div>

        {/* Identity & Score */}
        <div className="space-y-3">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white leading-none">
            {data.identity.name}
          </h2>
          <div className="flex items-baseline gap-2 font-mono text-zinc-400 pt-1">
            <span className="text-2xl font-bold text-white tabular-nums">
              {data.identity.score}
            </span>
            <span className="text-xs text-zinc-600">/ 100</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="pt-2 pb-4 border-y border-zinc-900 flex items-center justify-between font-mono">
          <div>
            <div className="text-2xl font-black text-white tabular-nums">
              {formatNumber(data.activity.transactions)}
            </div>
            <div className="text-[11px] text-zinc-500 uppercase">moves</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-white tabular-nums">
              {data.activity.activeDays}
            </div>
            <div className="text-[11px] text-zinc-500 uppercase">active days</div>
          </div>
        </div>

        {/* Roast snippet */}
        {data.roast.lines[0] && (
          <p className="text-sm font-serif italic text-zinc-400 leading-relaxed">
            &ldquo;{data.roast.lines[0]}&rdquo;
          </p>
        )}

        {/* Footer address */}
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-600 pt-2 border-t border-zinc-900">
          <span>{formatAddress(data.wallet, 6, 6)}</span>
          <span className="tracking-widest uppercase">BASE</span>
        </div>
      </motion.div>

      {/* Clean action buttons */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleShare}
          className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black font-mono font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-colors min-h-[46px]"
        >
          {copiedLink ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span>LINK COPIED</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>SHARE WRAPPED</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenCompare}
          className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-mono text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-colors min-h-[44px]"
        >
          <Swords className="w-4 h-4 text-zinc-400" />
          <span>COMPARE ME</span>
        </button>

        <button
          type="button"
          onClick={onRestart}
          className="w-full py-2 text-xs font-mono text-zinc-600 hover:text-zinc-400 transition-colors flex items-center justify-center gap-1.5"
        >
          <RefreshCw className="w-3 h-3" />
          <span>CHECK ANOTHER WALLET</span>
        </button>
      </div>
    </div>
  );
}
