'use client';

import React, { useState } from 'react';
import { RangeOption, CompareResponse } from '@/lib/types';
import { compareWallets, WrappedApiError } from '@/lib/api';
import { formatAddress, getFriendlyErrorMessage } from '@/lib/format';
import { ArrowLeft, AlertCircle, ArrowUpRight } from 'lucide-react';

interface CompareProps {
  myWallet: string;
  myIdentityName?: string;
  range: RangeOption;
  onBack: () => void;
}

export function CompareScreen({ myWallet, range, onBack }: CompareProps) {
  const [otherWallet, setOtherWallet] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  const handleRunCompare = async () => {
    const clean = otherWallet.trim();
    if (!clean) {
      setError('Please provide a second Base wallet address.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await compareWallets(myWallet, clean, range);
      setResult(data);
    } catch (err: unknown) {
      if (err instanceof WrappedApiError) {
        setError(getFriendlyErrorMessage(err.code, err.message));
      } else {
        setError('Something went sideways while comparing wallets. Try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 space-y-8">
      {/* Top back control */}
      <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>BACK TO WRAPPED</span>
        </button>

        <span className="uppercase tracking-widest">HEAD-TO-HEAD</span>
      </div>

      {!result ? (
        <div className="p-8 sm:p-10 rounded-2xl bg-[#080808] border border-zinc-800 space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black uppercase text-white tracking-tight leading-none">
              WHO IS MORE DEGEN?
            </h2>
            <p className="text-xs font-mono text-zinc-500">
              Enter any Base address to compare records.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
                YOUR WALLET
              </span>
              <div className="p-3 rounded-lg bg-black border border-zinc-800/80 font-mono text-xs text-zinc-300">
                {formatAddress(myWallet, 8, 8)}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
                RIVAL WALLET
              </span>
              <input
                type="text"
                value={otherWallet}
                onChange={(e) => setOtherWallet(e.target.value)}
                placeholder="Paste rival Base address (0x...)"
                spellCheck={false}
                className="w-full p-3 rounded-lg bg-black border border-zinc-800 focus:border-zinc-500 font-mono text-xs text-white placeholder-zinc-700 focus:outline-none min-h-[44px]"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-red-400 text-xs font-mono">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleRunCompare}
              disabled={isLoading || !otherWallet.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black font-mono font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-colors disabled:opacity-30 min-h-[46px]"
            >
              {isLoading ? (
                <span>COMPARING CHAIN...</span>
              ) : (
                <>
                  <span>RUN HEAD-TO-HEAD</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Editorial duel outcome */
        <div className="space-y-6">
          {/* Billboard */}
          <div className="p-8 sm:p-10 rounded-2xl bg-[#080808] border border-zinc-800 space-y-6">
            <div className="space-y-1">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                OUTCOME
              </p>
              <h2 className="text-4xl sm:text-5xl font-black uppercase text-white tracking-tight leading-none">
                {result.comparison.overall.winner === 'a'
                  ? 'YOU WON.'
                  : result.comparison.overall.winner === 'b'
                  ? 'THEY WON.'
                  : 'TIED MATCH.'}
              </h2>
            </div>

            {/* Duel Score */}
            <div className="grid grid-cols-2 gap-4 py-4 border-y border-zinc-900 font-mono">
              <div>
                <div className="text-xs uppercase text-zinc-500">YOU</div>
                <div className="text-3xl font-black text-white">
                  {result.comparison.overall.aWins}
                </div>
                <div className="text-[11px] text-zinc-400 truncate uppercase pt-1">
                  {result.a.identity.name}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs uppercase text-zinc-500">THEM</div>
                <div className="text-3xl font-black text-white">
                  {result.comparison.overall.bWins}
                </div>
                <div className="text-[11px] text-zinc-400 truncate uppercase pt-1">
                  {result.b.identity.name}
                </div>
              </div>
            </div>

            {result.comparison.overall.headline && (
              <p className="text-xs font-mono text-zinc-400">
                {result.comparison.overall.headline}
              </p>
            )}
          </div>

          {/* Editorial Category Moments */}
          <div className="space-y-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 px-1">
              CATEGORY BREAKDOWN
            </p>

            <div className="space-y-2">
              {result.comparison.categories.map((cat) => {
                const youWon = cat.winner === 'a';
                const theyWon = cat.winner === 'b';

                return (
                  <div
                    key={cat.key}
                    className="p-4 rounded-xl bg-[#080808] border border-zinc-900 flex items-center justify-between text-xs font-mono"
                  >
                    <div className="space-y-0.5">
                      <div className="text-white font-semibold uppercase">{cat.name}</div>
                      <div className="text-[11px] text-zinc-500">
                        {youWon ? 'YOU WIN' : theyWon ? 'THEY WIN' : 'TIE'}
                        {cat.difference ? ` (${cat.difference})` : ''}
                      </div>
                    </div>

                    <div className="text-right space-y-0.5">
                      <div className="text-zinc-300 tabular-nums">
                        {cat.aValue} <span className="text-zinc-600">vs</span> {cat.bValue}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setResult(null)}
            className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-mono text-xs uppercase tracking-wider transition-colors"
          >
            COMPARE ANOTHER WALLET
          </button>
        </div>
      )}
    </div>
  );
}
