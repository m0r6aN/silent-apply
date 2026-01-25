/**
 * Q&A API Endpoint (Canon-Compliant)
 *
 * POST /api/qa - Submit a question
 *
 * Enforces RECRUITER_Q&A_CANON_v1:
 * - Bounded answers only
 * - No inference beyond source data
 * - No salary/compensation automation
 * - Quiet rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getOrCreateCorrelationId, CORRELATION_HEADER, createCorrelationLogger } from '@/lib/omega/correlation';
import { executeTask } from '@/lib/omega/dispatch';
import { allowQAQuestion, allowQAQuestionByIP, getClientIP } from '@/lib/rateLimit';

const askQuestionSchema = z.object({
  profileHandle: z.string().min(1).max(64),
  question: z.string().min(1).max(500),
  recruiterEmail: z.string().email().optional(),
  recruiterName: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  const correlationId = await getOrCreateCorrelationId();
  const log = createCorrelationLogger(correlationId);

  try {
    const body = await request.json();
    const validation = askQuestionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        {
          status: 400,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }

    const { profileHandle, question, recruiterEmail, recruiterName } = validation.data;

    // Find profile
    const profile = await prisma.profile.findUnique({
      where: {
        handle: profileHandle,
        published: true,
      },
      select: {
        id: true,
        handle: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found or not published' },
        {
          status: 404,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }

    // Quiet rate limiting (Canon: progressive quiet throttling)
    const clientIP = getClientIP(request.headers);
    const [profileLimit, ipLimit] = await Promise.all([
      allowQAQuestion(profile.id),
      allowQAQuestionByIP(clientIP),
    ]);

    // If rate limited, return a neutral response (no "blocked" message)
    if (!profileLimit.allowed || !ipLimit.allowed) {
      log.info('qa.rate_limited', {
        profileId: profile.id,
        profileLimitAllowed: profileLimit.allowed,
        ipLimitAllowed: ipLimit.allowed,
      });

      // Canon: system simply becomes less responsive
      // Return a calm, non-informative response
      return NextResponse.json(
        {
          answer: "That information isn't available here.",
          sources: [],
          correlationId,
        },
        {
          status: 200, // Not 429 - quiet suppression
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }

    // Execute Q&A task via OMEGA dispatch
    log.info('qa.question_submitted', {
      profileId: profile.id,
      questionLength: question.length,
    });

    const taskResult = await executeTask(
      'qa.answer',
      {
        profileId: profile.id,
        question,
        recruiterEmail,
        recruiterName,
      },
      correlationId
    );

    const qaResult = taskResult.result;

    // Log allowed event (per CANON observability rules)
    await prisma.analyticsEvent.create({
      data: {
        profileId: profile.id,
        eventType: 'qa.question_submitted',
        metadataJson: {
          correlationId,
          status: qaResult.status,
          hasAnswer: !!qaResult.answer,
          sourceCount: qaResult.sources?.length ?? 0,
        },
      },
    });

    // Return response
    if (qaResult.status === 'failure') {
      log.error('qa.task_failed', qaResult.error, { profileId: profile.id });
      return NextResponse.json(
        { error: 'Unable to process question' },
        {
          status: 500,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }

    return NextResponse.json(
      {
        answer: qaResult.answer ?? qaResult.refusalReason,
        status: qaResult.status,
        sources: qaResult.sources ?? [],
        qaRecordId: qaResult.qaRecordId,
        correlationId,
      },
      {
        status: 200,
        headers: { [CORRELATION_HEADER]: correlationId },
      }
    );
  } catch (error) {
    log.error('qa.endpoint_error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: { [CORRELATION_HEADER]: correlationId },
      }
    );
  }
}
