/**
 * Q&A API Endpoint (Canon-Compliant)
 *
 * POST /api/qa - Submit a question
 *
 * Enforces CANON.md and RECRUITER_Q&A_CANON_v1:
 * - Bounded answers only — answers come from candidate-provided data
 * - No inference beyond source data
 * - Quiet rate limiting
 * - Optional Keon governance: records a receipt when KEON_GOVERNANCE_ENABLED=true
 *   If governance is not configured, local bounded answering still works.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getOrCreateCorrelationId, CORRELATION_HEADER, createCorrelationLogger } from '@/lib/correlation';
import { allowQAQuestion, allowQAQuestionByIP, getClientIP } from '@/lib/rateLimit';
import { recordQAGovernance } from '@/lib/keon/governance';
import crypto from 'crypto';

const askQuestionSchema = z.object({
  profileHandle: z.string().min(1).max(64),
  question: z.string().min(1).max(500),
});

interface ProfileData {
  id: string;
  headline: string | null;
  roles: string[];
  locationMode: string;
  commuteMiles: number | null;
  workAuthJson: unknown;
  availabilityJson: unknown;
  compJson: unknown;
  visibilityJson: unknown;
  resumes: { parsedText: string }[];
}

function boundedAnswer(question: string, profile: ProfileData): string {
  const q = question.toLowerCase();
  const workAuth = profile.workAuthJson as Record<string, unknown>;
  const availability = profile.availabilityJson as Record<string, unknown>;
  const comp = profile.compJson as Record<string, unknown> | null;
  const visibility = profile.visibilityJson as Record<string, unknown>;

  // Work authorization
  if (/visa|work auth|authorized|citizen|sponsorship|green card|clearance/i.test(q)) {
    if (visibility?.workAuth) {
      if (workAuth?.citizen) return 'US citizen. No sponsorship required.';
      if (workAuth?.visa) return `Work authorized — ${workAuth.visa}. No additional sponsorship required.`;
      if (workAuth?.clearance) return `Security clearance: ${workAuth.clearance}.`;
    }
    return "Work authorization details are not shared here.";
  }

  // Location / remote
  if (/remote|location|office|onsite|hybrid|travel|relocate|where/i.test(q)) {
    const mode = profile.locationMode;
    if (mode === 'remote') return 'Open to remote work.';
    if (mode === 'hybrid') {
      return profile.commuteMiles
        ? `Open to hybrid within ${profile.commuteMiles} miles.`
        : 'Open to hybrid arrangements.';
    }
    if (mode === 'onsite') {
      return profile.commuteMiles
        ? `Prefers onsite within ${profile.commuteMiles} miles.`
        : 'Prefers onsite work.';
    }
  }

  // Availability / start date
  if (/availab|start|begin|when|notice|open to|consider/i.test(q)) {
    const parts: string[] = [];
    if (availability?.startDate) parts.push(`Available from ${availability.startDate}`);
    if (typeof availability?.noticePeriod === 'number' && availability.noticePeriod > 0) {
      parts.push(`${availability.noticePeriod}-day notice period`);
    }
    if (availability?.employmentType) {
      const et = String(availability.employmentType).replace(/-/g, ' ');
      parts.push(`Seeking ${et}`);
    }
    if (parts.length > 0) return parts.join('. ') + '.';
  }

  // Compensation
  if (/salary|comp|pay|rate|compensation|money|cost|budget|package|earn/i.test(q)) {
    if (comp?.visible && visibility?.compensation) {
      const currency = comp.currency ?? 'USD';
      const min = typeof comp.min === 'number' ? comp.min.toLocaleString() : '?';
      const max = typeof comp.max === 'number' ? comp.max.toLocaleString() : '?';
      return `Compensation expectations: ${currency} ${min}–${max} annually.`;
    }
    return "Compensation information is not shared here.";
  }

  // Roles / experience
  if (/role|title|position|experience|what do|skill|background|expertise|focus/i.test(q)) {
    if (profile.roles.length > 0) return `Focused on: ${profile.roles.join(', ')}.`;
    if (profile.headline) return profile.headline;
  }

  // Resume
  if (/resume|cv|work sample/i.test(q)) {
    const vis = visibility as { resume?: boolean };
    if (vis?.resume) return 'Resume is available for download on this profile.';
    return 'Resume is not shared here. Specific questions about experience are welcome.';
  }

  // Resume text search (if resume is parsed and available)
  if (profile.resumes.length > 0) {
    const resumeText = profile.resumes[0].parsedText ?? '';
    if (resumeText.length > 50) {
      // Very simple: check if key words from question appear in resume text
      const words = q.split(/\s+/).filter((w) => w.length > 3);
      const matchCount = words.filter((w) => resumeText.toLowerCase().includes(w)).length;
      if (matchCount >= 2) {
        return "That information may be in the resume. Download the resume above if enabled, or ask a more specific question.";
      }
    }
  }

  return "That information isn't available here.";
}

export async function POST(request: NextRequest) {
  const correlationId = await getOrCreateCorrelationId();
  const log = createCorrelationLogger(correlationId);

  try {
    const body = await request.json();
    const validation = askQuestionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400, headers: { [CORRELATION_HEADER]: correlationId } }
      );
    }

    const { profileHandle, question } = validation.data;

    const profile = await prisma.profile.findUnique({
      where: { handle: profileHandle, published: true },
      select: {
        id: true,
        headline: true,
        roles: true,
        locationMode: true,
        commuteMiles: true,
        workAuthJson: true,
        availabilityJson: true,
        compJson: true,
        visibilityJson: true,
        resumes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { parsedText: true },
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404, headers: { [CORRELATION_HEADER]: correlationId } }
      );
    }

    // Quiet rate limiting
    const clientIP = getClientIP(request.headers);
    const [profileLimit, ipLimit] = await Promise.all([
      allowQAQuestion(profile.id),
      allowQAQuestionByIP(clientIP),
    ]);

    if (!profileLimit.allowed || !ipLimit.allowed) {
      log.info('qa.rate_limited', { profileId: profile.id });
      return NextResponse.json(
        { answer: "That information isn't available here.", sources: [], correlationId },
        { status: 200, headers: { [CORRELATION_HEADER]: correlationId } }
      );
    }

    // Generate bounded answer from candidate data only
    const answer = boundedAnswer(question, profile as ProfileData);

    // Attempt Keon governance (fire-and-forget — does not block the answer)
    const questionHash = crypto.createHash('sha256').update(question).digest('hex').slice(0, 16);
    const governance = await recordQAGovernance(profile.id, questionHash, correlationId).catch(() => ({
      governed: false,
      receipts: null,
      decisionStatus: null,
    }));

    // Log the event
    const eventMeta = JSON.parse(JSON.stringify({
      correlationId,
      governed: governance.governed,
      governanceDecision: governance.decisionStatus,
      receiptIds: governance.governed ? governance.receipts : null,
    }));
    await prisma.analyticsEvent.create({
      data: {
        profileId: profile.id,
        eventType: 'qa.question_submitted',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadataJson: eventMeta as any,
      },
    });

    log.info('qa.answered', {
      profileId: profile.id,
      governed: governance.governed,
    });

    return NextResponse.json(
      {
        answer,
        sources: [],
        governed: governance.governed,
        receiptId: governance.governed ? governance.receipts?.outcome : null,
        correlationId,
      },
      { status: 200, headers: { [CORRELATION_HEADER]: correlationId } }
    );
  } catch (error) {
    log.error('qa.endpoint_error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { [CORRELATION_HEADER]: correlationId } }
    );
  }
}
