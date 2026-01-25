/**
 * QA Answer Task (OMEGA Agent)
 *
 * Generates bounded answers to recruiter questions using ONLY
 * candidate-approved profile data and resume content.
 *
 * CANON ENFORCEMENT (RECRUITER_Q&A_CANON_v1):
 * - Answering Authority: Only from profile data, resume, candidate-approved info
 * - Forbidden Sources: No inference, assumptions, external enrichment
 * - Tone: Calm, declarative, neutral, bounded
 * - Out-of-scope detection: Salary, compensation, personal, legal, predictions
 */

import { prisma } from '@/lib/prisma';
import { createCorrelationLogger } from '../correlation';

export interface QAAnswerInput {
  correlationId: string;
  profileId: string;
  question: string;
  recruiterEmail?: string;
  recruiterName?: string;
}

export interface QAAnswerOutput {
  correlationId: string;
  profileId: string;
  status: 'answered' | 'refused' | 'failure';
  answer?: string;
  refusalReason?: string;
  qaRecordId?: string;
  sources?: string[];
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
}

// Out-of-scope categories that trigger refusal
const OUT_OF_SCOPE_PATTERNS = [
  // Salary negotiation
  /salary|compensation|pay|wage|earning|income|rate|money/i,
  /what.*(take|need|want|expect).*to/i,
  /how much/i,
  /negotiate/i,
  // Personal questions
  /married|spouse|wife|husband|partner|family|kids|children/i,
  /age|birthday|born|old are you/i,
  /religion|religious|political|party/i,
  /health|medical|disability|condition/i,
  // Legal interpretations
  /legal|lawsuit|sue|court|attorney|lawyer/i,
  /is it legal|legally/i,
  // Guarantees or predictions
  /guarantee|promise|certain|definitely|will.*succeed/i,
  /predict|future|forecast/i,
  // Behavioral hypotheticals
  /would you|what if|imagine|suppose|hypothetically/i,
  /how would you handle/i,
];

// Canon refusal responses (Section 5)
const REFUSAL_RESPONSES = [
  "That isn't available here.",
  "The candidate hasn't shared that here.",
  "You can discuss that directly with the candidate.",
];

function selectRefusal(): string {
  return REFUSAL_RESPONSES[Math.floor(Math.random() * REFUSAL_RESPONSES.length)];
}

function isOutOfScope(question: string): boolean {
  return OUT_OF_SCOPE_PATTERNS.some(pattern => pattern.test(question));
}

// Allowed answer phrasing prefixes (Section 3)
const ANSWER_PREFIXES = [
  "This profile indicates",
  "The candidate has shared",
  "According to the profile",
];

function formatAnswer(content: string): string {
  const prefix = ANSWER_PREFIXES[Math.floor(Math.random() * ANSWER_PREFIXES.length)];
  return `${prefix} ${content}`;
}

/**
 * Execute the Q&A answer task
 */
export async function executeQAAnswer(input: QAAnswerInput): Promise<QAAnswerOutput> {
  const { correlationId, profileId, question, recruiterEmail, recruiterName } = input;
  const log = createCorrelationLogger(correlationId);

  log.info('task.qa_answer.started', {
    profileId,
    questionLength: question.length,
    hasRecruiterEmail: !!recruiterEmail,
  });

  // Step 1: Check for out-of-scope question
  if (isOutOfScope(question)) {
    log.info('task.qa_answer.refused', {
      profileId,
      reason: 'out_of_scope',
    });

    const refusalReason = selectRefusal();

    // Store the Q&A record
    const thread = await prisma.qAThread.create({
      data: { profileId },
    });

    await prisma.qAMessage.create({
      data: {
        threadId: thread.id,
        role: 'recruiter',
        content: question,
        status: 'answered',
        sourcesJson: [],
      },
    });

    const systemMsg = await prisma.qAMessage.create({
      data: {
        threadId: thread.id,
        role: 'system',
        content: refusalReason,
        status: 'refused',
        sourcesJson: [],
      },
    });

    return {
      correlationId,
      profileId,
      status: 'refused',
      refusalReason,
      qaRecordId: thread.id,
      sources: [],
    };
  }

  // Step 2: Load profile data
  log.info('task.qa_answer.step', { step: 'load_profile' });

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      resumes: {
        include: {
          chunks: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!profile || !profile.published) {
    log.warn('task.qa_answer.profile_not_found', { profileId });
    return {
      correlationId,
      profileId,
      status: 'failure',
      error: {
        code: 'PROFILE_NOT_FOUND',
        message: 'Profile does not exist or is unpublished',
        retriable: false,
      },
    };
  }

  // Step 3: Extract relevant data based on question keywords
  log.info('task.qa_answer.step', { step: 'extract_answer' });

  const questionLower = question.toLowerCase();
  let answer: string | null = null;
  const sources: string[] = [];

  // Work authorization
  if (/work.*auth|visa|citizen|sponsor|permit/i.test(questionLower)) {
    const workAuth = profile.workAuthJson as Record<string, unknown>;
    if (workAuth) {
      if (workAuth.citizen) {
        answer = formatAnswer('the candidate is a citizen and does not require visa sponsorship.');
        sources.push('work_auth');
      } else if (workAuth.visa) {
        answer = formatAnswer(`the candidate requires ${workAuth.visa} visa sponsorship.`);
        sources.push('work_auth');
      } else if (workAuth.status) {
        answer = formatAnswer(`the candidate's work authorization status is: ${workAuth.status}.`);
        sources.push('work_auth');
      }
    }
  }

  // Availability / start date
  if (!answer && /available|start.*date|notice|begin|when.*can/i.test(questionLower)) {
    const availability = profile.availabilityJson as Record<string, unknown>;
    if (availability) {
      const parts: string[] = [];
      if (availability.startDate) {
        parts.push(`available to start on ${availability.startDate}`);
      }
      if (availability.noticePeriod) {
        parts.push(`a ${availability.noticePeriod} day notice period`);
      }
      if (availability.immediate) {
        parts.push('available to start immediately');
      }
      if (parts.length > 0) {
        answer = formatAnswer(`the candidate is ${parts.join(', and has ')}.`);
        sources.push('availability');
      }
    }
  }

  // Location / remote / hybrid
  if (!answer && /location|remote|hybrid|onsite|office|work.*from|commute|relocate/i.test(questionLower)) {
    const parts: string[] = [];
    if (profile.locationMode) {
      parts.push(`prefers ${profile.locationMode} work`);
    }
    if (profile.commuteMiles) {
      parts.push(`willing to commute up to ${profile.commuteMiles} miles`);
    }
    if (parts.length > 0) {
      answer = formatAnswer(`the candidate ${parts.join(', and is ')}.`);
      sources.push('location_mode');
    }
  }

  // Roles / positions
  if (!answer && /role|position|title|job|looking.*for|interested.*in/i.test(questionLower)) {
    if (profile.roles && profile.roles.length > 0) {
      answer = formatAnswer(`the candidate is interested in ${profile.roles.join(', ')} roles.`);
      sources.push('roles');
    }
  }

  // Skills / experience (from resume chunks)
  if (!answer && /skill|experience|technology|language|framework|tool|know/i.test(questionLower)) {
    const resume = profile.resumes[0];
    if (resume && resume.chunks && resume.chunks.length > 0) {
      // Search chunks for relevant content
      const searchTerms = questionLower.split(/\s+/).filter(t => t.length > 3);
      const relevantChunks = resume.chunks
        .filter(chunk =>
          searchTerms.some(term => chunk.content.toLowerCase().includes(term))
        )
        .slice(0, 2);

      if (relevantChunks.length > 0) {
        const summary = relevantChunks.map(c => c.content).join(' ').slice(0, 300);
        answer = formatAnswer(`the resume indicates: ${summary}...`);
        sources.push('resume');
      }
    }
  }

  // Proof / examples / portfolio
  if (!answer && /proof|example|portfolio|work.*sample|project|github|link/i.test(questionLower)) {
    if (profile.proofLinks && Array.isArray(profile.proofLinks) && profile.proofLinks.length > 0) {
      const links = profile.proofLinks as Array<{ label?: string; url?: string }>;
      const linkList = links.map(l => l.label || l.url).filter(Boolean).join(', ');
      if (linkList) {
        answer = formatAnswer(`the candidate has shared proof links: ${linkList}.`);
        sources.push('proof_links');
      }
    }
  }

  // No specific match - provide bounded response
  if (!answer) {
    answer = "That information isn't available here.";
    // This is a neutral non-answer, not a refusal
  }

  // Step 4: Store Q&A record
  log.info('task.qa_answer.step', { step: 'store_record' });

  const thread = await prisma.qAThread.create({
    data: { profileId },
  });

  await prisma.qAMessage.create({
    data: {
      threadId: thread.id,
      role: 'recruiter',
      content: question,
      status: 'answered',
      sourcesJson: [],
    },
  });

  await prisma.qAMessage.create({
    data: {
      threadId: thread.id,
      role: 'system',
      content: answer,
      status: 'answered',
      sourcesJson: sources,
    },
  });

  log.info('task.qa_answer.completed', {
    profileId,
    qaRecordId: thread.id,
    sourceCount: sources.length,
  });

  return {
    correlationId,
    profileId,
    status: 'answered',
    answer,
    qaRecordId: thread.id,
    sources,
  };
}
