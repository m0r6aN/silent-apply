import { callKeonGateway, type KeonResult } from './client';

export interface GovernanceReceipts {
  directive: string | null;
  intent: string | null;
  decision: string | null;
  execution: string | null;
  outcome: string | null;
}

export interface QAGovernanceRecord {
  governed: boolean;
  receipts: GovernanceReceipts | null;
  decisionStatus: string | null;
}

export interface ResumeParseGovernanceRecord {
  governed: boolean;
  receipts: GovernanceReceipts | null;
  decisionStatus: string | null;
}

function extractReceipts(result: KeonResult): GovernanceReceipts | null {
  if (!result.governed) return null;
  return {
    directive: result.receipts.directive,
    intent: result.receipts.intent,
    decision: result.receipts.decision,
    execution: result.receipts.execution,
    outcome: result.receipts.outcome,
  };
}

export async function recordQAGovernance(
  profileId: string,
  questionHash: string,
  correlationId: string
): Promise<QAGovernanceRecord> {
  try {
    const result = await callKeonGateway({
      purpose: 'Record governance for candidate-bounded recruiter Q&A response',
      action: 'silentapply.qa.record',
      resource: { type: 'silentapply.profile', id: profileId },
      params: {
        question_hash: questionHash,
        constraint: 'answer_only_from_candidate_provided_data',
      },
      correlationId,
    });

    return {
      governed: result.governed,
      receipts: extractReceipts(result),
      decisionStatus: result.governed ? (result.decision?.status ?? null) : null,
    };
  } catch {
    return { governed: false, receipts: null, decisionStatus: null };
  }
}

export async function recordResumeParseGovernance(
  profileId: string,
  resumeId: string,
  correlationId: string
): Promise<ResumeParseGovernanceRecord> {
  try {
    const result = await callKeonGateway({
      purpose: 'Record governance for candidate resume text extraction',
      action: 'silentapply.resume.parse',
      resource: { type: 'silentapply.resume', id: resumeId },
      params: {
        profile_id: profileId,
        constraint: 'extract_only_candidate_provided_text',
      },
      correlationId,
    });

    return {
      governed: result.governed,
      receipts: extractReceipts(result),
      decisionStatus: result.governed ? (result.decision?.status ?? null) : null,
    };
  } catch {
    return { governed: false, receipts: null, decisionStatus: null };
  }
}
