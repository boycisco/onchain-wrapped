'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { WrappedData, RangeOption } from '@/lib/types';
import { ActivityCard } from './activity';
import { IdentityCard } from './identity';
import { TimingCard } from './timing';
import { MoneyCard } from './money';
import { AddressesCard } from './addresses';
import { RoastCard } from './roast';
import { ShareSummaryCard } from './share';
import { CompareScreen } from './compare';
import { CardShell, CardMotionWrapper } from './cards';
import { ArrowRight, X } from 'lucide-react';

interface WrappedExperienceProps {
  wrapped: WrappedData;
  range: RangeOption;
  onExit: () => void;
}

type ScreenType =
  | 'intro'
  | 'activity'
  | 'identity'
  | 'timing'
  | 'money'
  | 'addresses'
  | 'roast'
  | 'summary';

export function WrappedExperience({ wrapped, range, onExit }: WrappedExperienceProps) {
  const [isComparing, setIsComparing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Active screens: intro + canonical cards + summary
  const screens = useMemo(() => {
    const list: { id: ScreenType; label: string }[] = [{ id: 'intro', label: 'INTRO' }];

    wrapped.cards.forEach((cardKey) => {
      if (cardKey === 'activity') list.push({ id: 'activity', label: 'ACTIVITY' });
      else if (cardKey === 'identity') list.push({ id: 'identity', label: 'IDENTITY' });
      else if (cardKey === 'timing') list.push({ id: 'timing', label: 'TIMING' });
      else if (cardKey === 'money') list.push({ id: 'money', label: 'VALUE' });
      else if (cardKey === 'addresses' && wrapped.addresses) {
        list.push({ id: 'addresses', label: 'ADDRESSES' });
      } else if (cardKey === 'roast') list.push({ id: 'roast', label: 'ROAST' });
    });

    list.push({ id: 'summary', label: 'POSTER' });
    return list;
  }, [wrapped]);

  const currentScreen = screens[currentIndex] || screens[0];

  // Number of data cards (excluding intro and summary)
  const totalCards = screens.length - 2;
  const currentCardNum = Math.min(Math.max(currentIndex, 1), totalCards);

  const handleNext = useCallback(() => {
    if (currentIndex < screens.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, screens.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (isComparing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, isComparing, onExit]);

  if (isComparing) {
    return (
      <div className="min-h-screen bg-black text-white">
        <CompareScreen
          myWallet={wrapped.wallet}
          myIdentityName={wrapped.identity.name}
          range={range}
          onBack={() => setIsComparing(false)}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white flex flex-col justify-between p-4 sm:p-8 select-none">
      {/* Top minimal bar: progress indicator & close */}
      <header className="w-full max-w-lg mx-auto flex items-center justify-between text-xs font-mono text-zinc-500 pt-2 z-20">
        {/* Minimal progress: 01 ━━━━━━━ 06 */}
        <div className="flex items-center gap-2">
          {currentIndex > 0 && currentIndex < screens.length - 1 ? (
            <>
              <span className="text-zinc-300 font-semibold">
                {String(currentCardNum).padStart(2, '0')}
              </span>
              <div className="w-20 sm:w-28 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-300"
                  style={{ width: `${(currentCardNum / totalCards) * 100}%` }}
                />
              </div>
              <span className="text-zinc-600">
                {String(totalCards).padStart(2, '0')}
              </span>
            </>
          ) : (
            <span className="tracking-widest uppercase text-zinc-600">ONCHAIN WRAPPED</span>
          )}
        </div>

        <button
          type="button"
          onClick={onExit}
          title="Exit Wrapped"
          className="p-1 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* Main card viewport */}
      <main className="flex-1 flex items-center justify-center py-6 my-auto w-full">
        <AnimatePresence mode="wait">
          {currentScreen.id === 'intro' && (
            <CardMotionWrapper key="intro">
              <CardShell category="START">
                <div className="space-y-8">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="space-y-3"
                  >
                    <p className="text-xs font-mono tracking-[0.25em] uppercase text-zinc-500 font-semibold">
                      BASE ARCHIVE
                    </p>
                    <h2 className="text-5xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-white leading-[0.95]">
                      YOUR 2026
                      <br />
                      ON BASE.
                    </h2>
                    <p className="text-sm font-mono text-zinc-400">
                      We read your chain.
                    </p>
                  </motion.div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-6 py-3.5 rounded-xl bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black font-mono font-semibold text-xs tracking-wider uppercase flex items-center gap-2 transition-colors min-h-[46px]"
                    >
                      <span>REVEAL STORY</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </CardShell>
            </CardMotionWrapper>
          )}

          {currentScreen.id === 'activity' && (
            <ActivityCard
              key="activity"
              data={wrapped.activity}
              index={currentCardNum}
              total={totalCards}
            />
          )}

          {currentScreen.id === 'identity' && (
            <IdentityCard
              key="identity"
              data={wrapped.identity}
              index={currentCardNum}
              total={totalCards}
            />
          )}

          {currentScreen.id === 'timing' && (
            <TimingCard
              key="timing"
              data={wrapped.timing}
              index={currentCardNum}
              total={totalCards}
            />
          )}

          {currentScreen.id === 'money' && (
            <MoneyCard
              key="money"
              data={wrapped.money}
              index={currentCardNum}
              total={totalCards}
            />
          )}

          {currentScreen.id === 'addresses' && wrapped.addresses && (
            <AddressesCard
              key="addresses"
              data={wrapped.addresses}
              index={currentCardNum}
              total={totalCards}
            />
          )}

          {currentScreen.id === 'roast' && (
            <RoastCard
              key="roast"
              data={wrapped.roast}
              index={currentCardNum}
              total={totalCards}
            />
          )}

          {currentScreen.id === 'summary' && (
            <div key="summary" className="w-full">
              <ShareSummaryCard
                data={wrapped}
                onOpenCompare={() => setIsComparing(true)}
                onRestart={onExit}
              />
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom small controls (unless on summary) */}
      {currentScreen.id !== 'summary' && (
        <footer className="w-full max-w-lg mx-auto flex items-center justify-between text-xs font-mono text-zinc-500 pb-2 z-20">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="hover:text-white disabled:opacity-0 transition-opacity"
          >
            PREV
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="text-white hover:text-zinc-300 font-semibold transition-colors"
          >
            {currentIndex === screens.length - 2 ? 'SUMMARY →' : 'NEXT →'}
          </button>
        </footer>
      )}
    </div>
  );
}
