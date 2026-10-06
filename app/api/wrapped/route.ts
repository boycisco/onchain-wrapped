import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { runPipeline } from '@/app/core/pipeline';
import { InvalidAddressError, toApiError } from '@/app/core/errors';
import { parseWrappedRequest } from './parse';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const raw = await safeJson(request);
    const { wallet, range } = parseWrappedRequest(raw);

    const { wrapped, timings } = await runPipeline(wallet, range);

    return NextResponse.json(
      { wrapped, timings },
      {
        status: 200,
        headers: {
          'Cache-Control': 'private, max-age=0, must-revalidate',
        },
      },
    );
  } catch (err) {
    // Any malformed body becomes an INVALID_WALLET-shaped error rather than
    // an opaque 500. This keeps the API's failure modes predictable.
    if (err instanceof ZodError) {
      err = new InvalidAddressError(
        'Request body must be JSON with a "wallet" field.',
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