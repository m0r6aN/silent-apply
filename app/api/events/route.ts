import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const trackEventSchema = z.object({
  eventType: z.enum([
    'page_view',
    'profile_view',
    'qa_question',
    'booking_view',
    'booking_held',
    'booking_confirmed',
    'resume_download',
    'profile_edit',
    'profile_publish',
  ]),
  profileHandle: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const getAnalyticsSchema = z.object({
  profileHandle: z.string(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = trackEventSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { eventType, profileHandle, metadata } = validation.data;
    
    let profileId: string | undefined;
    
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
        metadataJson: metadata || {},
      },
    });

    return NextResponse.json({
      success: true,
      eventId: event.id,
      eventType,
      timestamp: event.createdAt.toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('Error tracking event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const profileHandle = searchParams.get('profileHandle');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const validation = getAnalyticsSchema.safeParse({ 
      profileHandle, 
      startDate, 
      endDate 
    });
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
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
        { status: 404 }
      );
    }

    const profile = user.profiles[0];
    
    // Build date filter
    const dateFilter: any = {};
    if (start) {
      dateFilter.gte = new Date(start);
    }
    if (end) {
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.lte = endDate;
    }

    // Get analytics events
    const events = await prisma.analyticsEvent.findMany({
      where: {
        profileId: profile.id,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Aggregate statistics
    const stats = {
      totalViews: events.filter(e => e.eventType === 'profile_view').length,
      totalQuestions: events.filter(e => e.eventType === 'qa_question').length,
      totalBookings: events.filter(e => e.eventType === 'booking_held' || e.eventType === 'booking_confirmed').length,
      totalDownloads: events.filter(e => e.eventType === 'resume_download').length,
      conversionRate: 0,
    };

    if (stats.totalViews > 0) {
      stats.conversionRate = Math.round((stats.totalBookings / stats.totalViews) * 100);
    }

    // Group by event type for chart data
    const eventsByType = events.reduce((acc, event) => {
      const date = event.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {};
      }
      if (!acc[date][event.eventType]) {
        acc[date][event.eventType] = 0;
      }
      acc[date][event.eventType]++;
      return acc;
    }, {} as Record<string, Record<string, number>>);

    // Format for charts
    const chartData = Object.entries(eventsByType).map(([date, counts]) => ({
      date,
      ...counts,
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Top questions (from QA events)
    const qaEvents = events.filter(e => e.eventType === 'qa_question');
    const questionCounts = qaEvents.reduce((acc, event) => {
      const metadata = event.metadataJson as any;
      const question = metadata?.question || 'Unknown question';
      if (!acc[question]) {
        acc[question] = 0;
      }
      acc[question]++;
      return acc;
    }, {} as Record<string, number>);

    const topQuestions = Object.entries(questionCounts)
      .map(([question, count]) => ({ question, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      profile: {
        handle: profile.handle,
        headline: profile.headline,
        published: profile.published,
        updatedAt: profile.updatedAt,
      },
      stats,
      chartData,
      topQuestions,
      recentEvents: events.slice(0, 10).map(event => ({
        id: event.id,
        eventType: event.eventType,
        metadata: event.metadataJson,
        timestamp: event.createdAt.toISOString(),
      })),
      totalEvents: events.length,
      timeRange: {
        start: start || 'all',
        end: end || 'now',
      },
    });

  } catch (error) {
    console.error('Error getting analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
