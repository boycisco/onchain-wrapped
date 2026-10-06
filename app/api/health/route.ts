import { NextResponse } from 'next/server';
import { rpc } from '@/app/data/rpc';
import { AppError } from '@/app/core/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  const started = Date.now();
  try {
    const block = await rpc.blockNumber();
    return NextResponse.json({
      ok: true,
      chain: 'base',
      block: block.toString(),
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const code = err instanceof AppError ? err.code : 'INTERNAL_ERROR';
    const message =
      err instanceof AppError ? err.message : 'Unexpected error.';
    return NextResponse.json(
      { ok: false, error: { code, message } },
      { status: code === 'PROVIDER_ERROR' ? 502 : 500 },
    );
  }
}
