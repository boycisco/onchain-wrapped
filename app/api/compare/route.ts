import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { runPipeline } from '@/app/core/pipeline';
import { compare } from '@/app/analysis/compare';
import { InvalidAddressError, toApiError } from '@/app/core/errors';
import { parseCompareRequest } from './parse';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const raw = await safeJson(request);
    const { wallet, other, range } = parseCompareRequest(raw);

    // Both pipelines share the same cache. Running them sequentially keeps
    // the provider load predictable; parallelizing would hammer the indexer
    // twice at once and can trip rate limits.
    const a = await runPipeline(wallet, range);
    const b = await runPipeline(other, range);

    const comparison = compare(a.wrapped, b.wrapped);

    return NextResponse.json(
      {
        a: a.wrapped,
        b: b.wrapped,
        comparison,
        timings: {
          a: a.timings,
          b: b.timings,
          total: a.timings.total + b.timings.total,
        },
        cached: { a: a.cached, b: b.cached },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=0, must-revalidate',
        },
      },
    );
  } catch (err) {
    if (err instanceof ZodError) {
      err = new InvalidAddressError(
        'Request body must be JSON with "wallet" and "other" fields.',
      );
    }
    const { status, body } = toApiError(err);
    return NextResponse.json(body, { status });
  }
}

async function safeJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}