import { z } from 'zod';
import { ConfigError } from './errors';

export type Config = {
  baseRpcUrl: string;
  alchemyApiKey?: string;
  geminiApiKey?: string;
};

const schema = z.object({
  BASE_RPC_URL: z
    .string({ message: 'BASE_RPC_URL is required' })
    .url({ message: 'BASE_RPC_URL must be a valid URL' }),
  ALCHEMY_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1).optional(),
});

function blankToUndefined(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * Load and validate environment configuration.
 * Pass an explicit env object in tests to avoid depending on process.env.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse({
    BASE_RPC_URL: blankToUndefined(env.BASE_RPC_URL),
    ALCHEMY_API_KEY: blankToUndefined(env.ALCHEMY_API_KEY),
    GEMINI_API_KEY: blankToUndefined(env.GEMINI_API_KEY),
  });

  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (i) => `${i.path.join('.') || '(root)'}: ${i.message}`,
    );
    throw new ConfigError('Invalid environment configuration', issues);
  }

  return {
    baseRpcUrl: parsed.data.BASE_RPC_URL,
    alchemyApiKey: parsed.data.ALCHEMY_API_KEY,
    geminiApiKey: parsed.data.GEMINI_API_KEY,
  };
}
