/**
 * Domain errors used across the pipeline.
 * Provider-specific errors are translated into these before leaving app/data.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ConfigError extends AppError {
  constructor(
    message: string,
    public readonly issues: string[] = [],
  ) {
    super(message, 'CONFIG_ERROR');
  }
}

export class InvalidAddressError extends AppError {
  constructor(message = 'Invalid Base wallet address.') {
    super(message, 'INVALID_WALLET');
  }
}

export class InvalidRangeError extends AppError {
  constructor(message = 'Invalid range.') {
    super(message, 'INVALID_RANGE');
  }
}

export class ProviderError extends AppError {
  constructor(
    message = 'Upstream provider error.',
    public readonly cause?: unknown,
  ) {
    super(message, 'PROVIDER_ERROR');
  }
}

/* ---------- API error serialization ---------- */

export type ApiErrorCode =
  | 'INVALID_WALLET'
  | 'INVALID_RANGE'
  | 'PROVIDER_ERROR'
  | 'RATE_LIMITED'
  | 'DATA_UNAVAILABLE'
  | 'ANALYSIS_ERROR'
  | 'CONFIG_ERROR'
  | 'INTERNAL_ERROR';

export type ApiError = {
  status: number;
  body: {
    error: {
      code: ApiErrorCode;
      message: string;
    };
  };
};

/**
 * Turn any thrown value into a stable HTTP status + JSON body.
 * Never leaks provider errors, stack traces, or secrets.
 */
export function toApiError(err: unknown): ApiError {
  if (err instanceof AppError) {
    const code = err.code as ApiErrorCode;
    const status = statusFor(code);
    return {
      status,
      body: { error: { code, message: err.message } },
    };
  }
  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected error.',
      },
    },
  };
}

function statusFor(code: ApiErrorCode): number {
  switch (code) {
    case 'INVALID_WALLET':
    case 'INVALID_RANGE':
      return 400;
    case 'CONFIG_ERROR':
    case 'INTERNAL_ERROR':
    case 'ANALYSIS_ERROR':
      return 500;
    case 'PROVIDER_ERROR':
    case 'RATE_LIMITED':
    case 'DATA_UNAVAILABLE':
      return 502;
  }
}