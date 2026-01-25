/**
 * Profile Contracts
 * 
 * Shared DTOs for profile data between UI and integrations.
 * These are canon-neutral data structures.
 */

/**
 * Profile visibility settings
 */
export interface ProfileVisibility {
  published: boolean;
  showResume: boolean;
  allowResumeDownload: boolean;
  enableQA: boolean;
  enableBooking: boolean;
}

/**
 * Profile basic information
 */
export interface ProfileBasicInfo {
  id: string;
  userId: string;
  handle: string;
  name: string;
  headline?: string;
  location?: string;
  workMode?: 'remote' | 'hybrid' | 'onsite' | 'flexible';
  roles?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Profile with visibility settings
 */
export interface Profile extends ProfileBasicInfo {
  visibility: ProfileVisibility;
}

/**
 * Public profile view (recruiter-facing)
 * 
 * Only includes data that candidate has chosen to share.
 */
export interface PublicProfile {
  handle: string;
  name: string;
  headline?: string;
  location?: string;
  workMode?: 'remote' | 'hybrid' | 'onsite' | 'flexible';
  roles?: string[];
  showResume: boolean;
  allowResumeDownload: boolean;
  enableQA: boolean;
  enableBooking: boolean;
}

/**
 * Profile creation request
 */
export interface CreateProfileRequest {
  handle: string;
  name: string;
  headline?: string;
  location?: string;
  workMode?: 'remote' | 'hybrid' | 'onsite' | 'flexible';
  roles?: string[];
}

/**
 * Profile update request
 */
export interface UpdateProfileRequest {
  name?: string;
  headline?: string;
  location?: string;
  workMode?: 'remote' | 'hybrid' | 'onsite' | 'flexible';
  roles?: string[];
  visibility?: Partial<ProfileVisibility>;
}

/**
 * Profile validation result
 */
export interface ProfileValidation {
  valid: boolean;
  errors?: {
    field: string;
    message: string;
  }[];
}

