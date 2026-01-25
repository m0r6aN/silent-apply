/**
 * Configuration Module
 * 
 * Public exports for application configuration.
 * 
 * Usage:
 * ```typescript
 * import { env, FEATURES, keonConfig } from '@/lib/config';
 * 
 * if (FEATURES.qa.enabled) {
 *   // Enable Q&A feature
 * }
 * ```
 */

export * from './env';
export * from './features';
export * from './integration';

