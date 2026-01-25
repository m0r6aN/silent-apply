/**
 * Analytics Events API (Canon-Compliant)
 *
 * GET /api/events - Get analytics for a profile (owner only)
 * POST /api/events - Track an allowed event
 *
 * ALLOWED EVENTS ONLY (per CANON.md):
 * - profile.viewed
 * - resume.downloaded
 * - qa.question_submitted
 * - booking.hold_created
 * - booking.confirmed
 *
 * FORBIDDEN:
 * - Session replay
 * - Cross-profile recruiter tracking
 * - Conversion metrics (removed)
 * - Recruiter scoring
 */

import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getOrCreateCorrelationId, CORRELATION_HEADER, createCorrelationLogger } from '@/lib/omega/correlation';
import { ALLOWED_EVENTS, isAllowedEvent } from '@/lib/omega/observability';

// Only allowed events can be tracked
const trackEventSchema = z.object({
  eventType: z.enum(ALLOWED_EVENTS),
  profileHandle: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const getAnalyticsSchema = z.object({
  profileHandle: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(request: NextRequest) {
  const correlationId = await getOrCreateCorrelationId();
  const log = createCorrelationLogger(correlationId);

  try {
    const body = await request.json();
    const validation = trackEventSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        {
          status: 400,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }

    const { eventType, profileHandle, metadata } = validation.data;

    // Double-check event is allowed (belt and suspenders)
    if (!isAllowedEvent(eventType)) {
      return NextResponse.json(
        { error: 'Event type not allowed' },
        {
          status: 400,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }

    let profileId: string | null = null;

    if (profileHandle) {
      const profile = await prisma.profile.findUnique({
        where: { handle: profileHandle },
        select: { id: true },
      });

      if (profile) {
        profileId = profile.id;
      }
    }

    // Create analytics event
    const event = await prisma.analyticsEvent.create({
      data: {
        profileId,
        eventType,
        metadataJson: {
          correlationId,
          ...metadata,
        },
      },
    });

    log.info(`event.${eventType}`, {
      eventId: event.id,
      profileId,
    });

    return NextResponse.json(
      {
        success: true,
        eventId: event.id,
        eventType,
        timestamp: event.createdAt.toISOString(),
        correlationId,
      },
      {
        status: 201,
        headers: { [CORRELATION_HEADER]: correlationId },
      }
    );
  } catch (error) {
    log.error('event.track_error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: { [CORRELATION_HEADER]: correlationId },
      }
    );
  }
}

export async function GET(request: NextRequest) {
  const correlationId = await getOrCreateCorrelationId();
  const log = createCorrelationLogger(correlationId);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        {
          status: 401,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const profileHandle = searchParams.get('profileHandle');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const validation = getAnalyticsSchema.safeParse({
      profileHandle,
      startDate,
      endDate,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        {
          status: 400,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }

    const { profileHandle: handle, startDate: start, endDate: end } = validation.data;

    // Find profile (must belong to user)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        profiles: {
          where: { handle },
        },
      },
    });

    if (!user || user.profiles.length === 0) {
      return NextResponse.json(
        { error: 'Profile not found or access denied' },
        {
          status: 404,
          headers: { [CORRELATION_HEADER]: correlationId },
        }
      );
    }

    const profile = user.profiles[0];

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (start) {
      dateFilter.gte = new Date(start);
    }
    if (end) {
      const endDateObj = new Date(end);
      endDateObj.setHours(23, 59, 59, 999);
      dateFilter.lte = endDateObj;
    }

    // Get analytics events (only allowed types)
    const events = await prisma.analyticsEvent.findMany({
      where: {
        profileId: profile.id,
        eventType: { in: [...ALLOWED_EVENTS] },
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Aggregate statistics (no conversion metrics per canon)
    const stats = {
      totalViews: events.filter(e => e.eventType === 'profile.viewed').length,
      totalQuestions: events.filter(e => e.eventType === 'qa.question_submitted').length,
      totalBookings: events.filter(e =>
        e.eventType === 'booking.hold_created' ||
        e.eventType === 'booking.confirmed'
      ).length,
      totalDownloads: events.filter(e => e.eventType === 'resume.downloaded').length,
      // NOTE: No conversion metrics (forbidden by canon)
    };

    // Group by event type for chart data
    const eventsByDate = events.reduce((acc, event) => {
      const date = event.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {} as Record<string, number>;
      }
      if (!acc[date][event.eventType]) {
        acc[date][event.eventType] = 0;
      }
      acc[date][event.eventType]++;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    const chartData = Object.entries(eventsByDate)
      .map(([date, counts]) => ({
        date,
        ...counts,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json(
      {
        profile: {
          handle: profile.handle,
          headline: profile.headline,
          published: profile.published,
          updatedAt: profile.updatedAt,
        },
        stats,
        chartData,
        recentEvents: events.slice(0, 10).map(event => ({
          id: event.id,
          eventType: event.eventType,
          timestamp: event.createdAt.toISOString(),
        })),
        totalEvents: events.length,
        timeRange: {
          start: start || 'all',
          end: end || 'now',
        },
        correlationId,
      },
      {
        status: 200,
        headers: { [CORRELATION_HEADER]: correlationId },
      }
    );
  } catch (error) {
    log.error('event.get_analytics_error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: { [CORRELATION_HEADER]: correlationId },
      }
    );
  }
}
