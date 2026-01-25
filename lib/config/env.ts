/**
 * Environment Configuration
 * 
 * Centralized environment variable mapping.
 * Validates required variables and provides type-safe access.
 */

/**
 * Environment variable schema
 */
interface EnvironmentVariables {
  // Node environment
  NODE_ENV: 'development' | 'production' | 'test';
  
  // Database
  DATABASE_URL: string;
  
  // Redis
  REDIS_URL?: string;
  
  // NextAuth
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;
  
  // GitHub OAuth
  GITHUB_ID?: string;
  GITHUB_SECRET?: string;
  
  // Google OAuth
  GOOGLE_ID?: string;
  GOOGLE_SECRET?: string;
  
  // Keon Integration
  KEON_ENABLED?: string;
  KEON_BASE_URL?: string;
  KEON_API_KEY?: string;
  
  // OMEGA Integration (always enabled)
  OMEGA_TASK_TIMEOUT_MS?: string;
  
  // Email (for booking notifications)
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SMTP_FROM?: string;
  
  // Feature Flags
  FEATURE_QA_ENABLED?: string;
  FEATURE_BOOKING_ENABLED?: string;
  FEATURE_EVIDENCE_ENABLED?: string;
}

/**
 * Get environment variable with type safety
 */
function getEnv<K extends keyof EnvironmentVariables>(
  key: K,
  defaultValue?: string
): string | undefined {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    return undefined;
  }
  return value ?? defaultValue;
}

/**
 * Get required environment variable (throws if missing)
 */
function getRequiredEnv<K extends keyof EnvironmentVariables>(key: K): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Environment configuration object
 */
export const env = {
  // Node environment
  nodeEnv: getEnv('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  isDevelopment: getEnv('NODE_ENV') === 'development',
  isProduction: getEnv('NODE_ENV') === 'production',
  isTest: getEnv('NODE_ENV') === 'test',
  
  // Database
  databaseUrl: getRequiredEnv('DATABASE_URL'),
  
  // Redis
  redisUrl: getEnv('REDIS_URL'),
  
  // NextAuth
  nextAuthUrl: getRequiredEnv('NEXTAUTH_URL'),
  nextAuthSecret: getRequiredEnv('NEXTAUTH_SECRET'),
  
  // GitHub OAuth
  githubId: getEnv('GITHUB_ID'),
  githubSecret: getEnv('GITHUB_SECRET'),
  
  // Google OAuth
  googleId: getEnv('GOOGLE_ID'),
  googleSecret: getEnv('GOOGLE_SECRET'),
  
  // Keon Integration
  keon: {
    enabled: getEnv('KEON_ENABLED') === 'true',
    baseUrl: getEnv('KEON_BASE_URL'),
    apiKey: getEnv('KEON_API_KEY'),
  },
  
  // OMEGA Integration
  omega: {
    taskTimeoutMs: parseInt(getEnv('OMEGA_TASK_TIMEOUT_MS', '30000'), 10),
  },
  
  // Email
  smtp: {
    host: getEnv('SMTP_HOST'),
    port: parseInt(getEnv('SMTP_PORT', '587'), 10),
    user: getEnv('SMTP_USER'),
    password: getEnv('SMTP_PASSWORD'),
    from: getEnv('SMTP_FROM', 'noreply@silentapply.ai'),
  },
  
  // Feature Flags
  features: {
    qaEnabled: getEnv('FEATURE_QA_ENABLED', 'true') === 'true',
    bookingEnabled: getEnv('FEATURE_BOOKING_ENABLED', 'false') === 'true',
    evidenceEnabled: getEnv('FEATURE_EVIDENCE_ENABLED', 'false') === 'true',
  },
} as const;

/**
 * Validate environment configuration
 * 
 * Call this at application startup to fail fast on missing config.
 */
export function validateEnv(): void {
  const required: (keyof EnvironmentVariables)[] = [
    'DATABASE_URL',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'See .env.example for required configuration.'
    );
  }
}

