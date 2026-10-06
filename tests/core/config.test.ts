import { describe, it, expect } from 'vitest';
import { loadConfig } from '@/app/core/config';
import { ConfigError } from '@/app/core/errors';

describe('loadConfig', () => {
  it('accepts a valid BASE_RPC_URL with no optional keys', () => {
    const cfg = loadConfig({ BASE_RPC_URL: 'https://mainnet.base.org' } as NodeJS.ProcessEnv);
    expect(cfg.baseRpcUrl).toBe('https://mainnet.base.org');
    expect(cfg.alchemyApiKey).toBeUndefined();
    expect(cfg.geminiApiKey).toBeUndefined();
  });

  it('treats empty optional values as undefined', () => {
    const cfg = loadConfig({
      BASE_RPC_URL: 'https://mainnet.base.org',
      ALCHEMY_API_KEY: '',
      GEMINI_API_KEY: '   ',
    } as NodeJS.ProcessEnv);
    expect(cfg.alchemyApiKey).toBeUndefined();
    expect(cfg.geminiApiKey).toBeUndefined();
  });

  it('keeps provided optional values', () => {
    const cfg = loadConfig({
      BASE_RPC_URL: 'https://mainnet.base.org',
      ALCHEMY_API_KEY: 'abc123',
      GEMINI_API_KEY: 'xyz789',
    } as NodeJS.ProcessEnv);
    expect(cfg.alchemyApiKey).toBe('abc123');
    expect(cfg.geminiApiKey).toBe('xyz789');
  });

  it('throws ConfigError when BASE_RPC_URL is missing', () => {
    expect(() => loadConfig({} as NodeJS.ProcessEnv)).toThrow(ConfigError);
  });

  it('throws ConfigError when BASE_RPC_URL is not a URL', () => {
    expect(() =>
      loadConfig({ BASE_RPC_URL: 'not-a-url' } as NodeJS.ProcessEnv),
    ).toThrow(ConfigError);
  });
});
