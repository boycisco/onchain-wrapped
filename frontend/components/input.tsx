'use client';

import React, { useState } from 'react';
import { ArrowUpRight, Clipboard, AlertCircle } from 'lucide-react';

interface InputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  error?: string | null;
  placeholder?: string;
}

export function WalletInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  error = null,
  placeholder = 'Paste a Base wallet address (0x...)',
}: InputProps) {
  const [pasteSuccess, setPasteSuccess] = useState(false);

  const handlePaste = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          onChange(text.trim());
          setPasteSuccess(true);
          setTimeout(() => setPasteSuccess(false), 1200);
        }
      }
    } catch {
      // Clipboard denied
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading && value.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* 1px clean bordered input surface */}
      <div className="flex flex-col sm:flex-row items-stretch gap-2">
        <div className="flex-1 flex items-center bg-[#0a0a0a] border border-zinc-800 focus-within:border-zinc-500 rounded-xl px-3.5 py-1.5 transition-colors duration-150">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={placeholder}
            spellCheck={false}
            autoComplete="off"
            className="w-full bg-transparent font-mono text-sm text-white placeholder-zinc-600 focus:outline-none min-h-[44px]"
          />

          {typeof navigator !== 'undefined' && (
            <button
              type="button"
              onClick={handlePaste}
              disabled={isLoading}
              title="Paste from clipboard"
              className="shrink-0 ml-2 px-2.5 py-1 text-[11px] font-mono text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded transition-colors flex items-center gap-1.5 min-h-[30px]"
            >
              <Clipboard className="w-3 h-3" />
              <span>{pasteSuccess ? 'PASTED' : 'PASTE'}</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || !value.trim()}
          className="px-6 py-3 rounded-xl bg-white hover:bg-zinc-200 active:bg-zinc-300 text-black font-semibold text-xs tracking-wider uppercase font-mono flex items-center justify-center gap-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-[48px] shrink-0"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              <span>READING CHAIN</span>
            </span>
          ) : (
            <>
              <span>SEE MY WRAPPED</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-red-400 text-xs font-mono leading-relaxed"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <div className="flex-1">{error}</div>
        </div>
      )}
    </div>
  );
}
