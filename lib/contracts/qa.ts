/**
 * Q&A Contracts
 * 
 * Shared DTOs for recruiter Q&A between UI and integrations.
 * These are canon-neutral data structures.
 */

/**
 * Q&A question from recruiter
 */
export interface QAQuestion {
  id: string;
  profileId: string;
  question: string;
  askedAt: Date;
  answeredAt?: Date;
  answer?: string;
  confidence?: number; // 0-1 scale
  sources?: string[]; // Which resume chunks were used
}

/**
 * Q&A ask request
 */
export interface AskQuestionRequest {
  question: string;
  recruiterEmail?: string; // Optional for tracking
}

/**
 * Q&A answer response
 */
export interface AnswerResponse {
  answer: string;
  confidence: number;
  sources?: string[];
  outOfScope?: boolean;
  boundedResponse?: string; // If question is out of scope
}

/**
 * Q&A history item (candidate view)
 */
export interface QAHistoryItem {
  id: string;
  question: string;
  answer: string;
  askedAt: Date;
  answeredAt: Date;
  recruiterEmail?: string;
}

/**
 * Public Q&A view (recruiter-facing)
 */
export interface PublicQA {
  question: string;
  answer: string;
  confidence: number;
}

/**
 * Q&A validation result
 */
export interface QAValidation {
  valid: boolean;
  errors?: {
    field: string;
    message: string;
  }[];
}

/**
 * Q&A scope check result
 * 
 * Determines if question can be answered from candidate data.
 */
export interface QAScopeCheck {
  inScope: boolean;
  reason?: string;
  suggestedResponse?: string;
}

