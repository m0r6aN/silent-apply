/**
 * Feature Flags
 * 
 * Centralized feature flag management.
 * Controls which features are enabled in the application.
 */

import { env } from './env';

/**
 * Feature flag definitions
 */
export const FEATURES = {
  /**
   * Q&A Feature
   * 
   * Allows recruiters to ask questions about candidate profiles.
   * Answers are generated from resume and profile data only.
   */
  qa: {
    enabled: env.features.qaEnabled,
    description: 'Recruiter Q&A from candidate data',
  },
  
  /**
   * Booking Feature
   * 
   * Allows recruiters to book time slots with candidates.
   * Supports holds, confirmations, and cancellations.
   */
  booking: {
    enabled: env.features.bookingEnabled,
    description: 'Recruiter booking and scheduling',
  },
  
  /**
   * Evidence Feature
   * 
   * Allows candidates to submit proof links (GitHub, LinkedIn, etc.).
   * Integrates with Keon for verification.
   */
  evidence: {
    enabled: env.features.evidenceEnabled,
    description: 'Candidate evidence submission and verification',
  },
  
  /**
   * Keon Integration
   * 
   * Enables Keon evidence verification and governance.
   * Requires KEON_ENABLED=true and KEON_BASE_URL to be set.
   */
  keon: {
    enabled: env.keon.enabled,
    description: 'Keon evidence verification and governance',
  },
  
  /**
   * Resume Download
   * 
   * Allows candidates to control resume download visibility.
   * Always available (core feature).
   */
  resumeDownload: {
    enabled: true,
    description: 'Candidate-controlled resume download',
  },
  
  /**
   * Profile Publishing
   * 
   * Allows candidates to publish/unpublish profiles.
   * Always available (core feature).
   */
  profilePublishing: {
    enabled: true,
    description: 'Candidate-controlled profile visibility',
  },
} as const;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature].enabled;
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(FEATURES)
    .filter(([_, config]) => config.enabled)
    .map(([name]) => name);
}

/**
 * Get all disabled features
 */
export function getDisabledFeatures(): string[] {
  return Object.entries(FEATURES)
    .filter(([_, config]) => !config.enabled)
    .map(([name]) => name);
}

/**
 * Feature flag guard for UI components
 * 
 * Usage:
 * ```typescript
 * if (featureGuard('qa')) {
 *   return <QAComponent />;
 * }
 * return null;
 * ```
 */
export function featureGuard(feature: keyof typeof FEATURES): boolean {
  return isFeatureEnabled(feature);
}

