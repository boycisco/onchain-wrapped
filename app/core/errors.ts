/**
 * Domain errors used across the pipeline.
 * Provider-specific errors are translated into these before leaving app/data.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
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
