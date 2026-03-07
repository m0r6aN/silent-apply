import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { subDays, startOfDay, endOfDay } from 'date-fns';

type DashboardProfile = {
  id: string;
  handle: string;
  headline: string | null;
  published: boolean;
  resumes: unknown[];
};

type GroupedStat = {
  eventType: string;
  _count: {
    eventType: number;
  };
};

type RecentEvent = {
  id: string;
  eventType: string;
  profile: {
    handle: string;
    headline: string | null;
  } | null;
  metadataJson: unknown;
  createdAt: Date;
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        profiles: {
          include: {
            resumes: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            _count: {
              select: {
                qaThreads: true,
                bookings: true,
                analyticsEvents: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate date ranges
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const thirtyDaysAgo = subDays(now, 30);

    // Get analytics for all user's profiles
    const profileIds = user.profiles.map((p: DashboardProfile) => p.id);
    
    const [recentEvents, weeklyStats, monthlyStats] = await Promise.all([
      // Recent events
      prisma.analyticsEvent.findMany({
        where: {
          profileId: { in: profileIds },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          profile: {
            select: {
              handle: true,
              headline: true,
            },
          },
        },
      }),
      
      // Weekly stats
      prisma.analyticsEvent.groupBy({
        by: ['eventType'],
        where: {
          profileId: { in: profileIds },
          createdAt: {
            gte: startOfDay(sevenDaysAgo),
            lte: endOfDay(now),
          },
        },
        _count: {
          eventType: true,
        },
      }),
      
      // Monthly stats
      prisma.analyticsEvent.groupBy({
        by: ['eventType'],
        where: {
          profileId: { in: profileIds },
          createdAt: {
            gte: startOfDay(thirtyDaysAgo),
            lte: endOfDay(now),
          },
        },
        _count: {
          eventType: true,
        },
      }),
    ]);

    // Format stats
    const formatStats = (stats: GroupedStat[]) => {
      const result: Record<string, number> = {};
      stats.forEach((stat) => {
        result[stat.eventType] = stat._count.eventType;
      });
      return result;
    };

    const weeklyStatsFormatted = formatStats(weeklyStats);
    const monthlyStatsFormatted = formatStats(monthlyStats);

    // Calculate totals
    const totalStats = {
      profiles: user.profiles.length,
      publishedProfiles: user.profiles.filter((p: DashboardProfile) => p.published).length,
      totalViews: monthlyStatsFormatted['profile_view'] || 0,
      totalQuestions: monthlyStatsFormatted['qa_question'] || 0,
      totalBookings: (monthlyStatsFormatted['booking_held'] || 0) + (monthlyStatsFormatted['booking_confirmed'] || 0),
      totalDownloads: monthlyStatsFormatted['resume_download'] || 0,
    };

    // Calculate conversion rate
    const conversionRate = totalStats.totalViews > 0 
      ? Math.round((totalStats.totalBookings / totalStats.totalViews) * 100)
      : 0;

    // Get top performing profile
    const profilePerformance = await Promise.all(
      user.profiles.map(async (profile: DashboardProfile) => {
        const [views, questions, bookings] = await Promise.all([
          prisma.analyticsEvent.count({
            where: {
              profileId: profile.id,
              eventType: 'profile_view',
              createdAt: {
                gte: startOfDay(thirtyDaysAgo),
              },
            },
          }),
          prisma.analyticsEvent.count({
            where: {
              profileId: profile.id,
              eventType: 'qa_question',
              createdAt: {
                gte: startOfDay(thirtyDaysAgo),
              },
            },
          }),
          prisma.analyticsEvent.count({
            where: {
              profileId: profile.id,
              eventType: { in: ['booking_held', 'booking_confirmed'] },
              createdAt: {
                gte: startOfDay(thirtyDaysAgo),
              },
            },
          }),
        ]);

        return {
          handle: profile.handle,
          headline: profile.headline,
          published: profile.published,
          views,
          questions,
          bookings,
          conversionRate: views > 0 ? Math.round((bookings / views) * 100) : 0,
          hasResume: profile.resumes.length > 0,
        };
      })
    );

    // Sort by performance
    profilePerformance.sort((a: { views: number }, b: { views: number }) => b.views - a.views);

    return NextResponse.json({
      user: {
        email: user.email,
        createdAt: user.createdAt,
      },
      totals: totalStats,
      conversionRate,
      weeklyStats: weeklyStatsFormatted,
      monthlyStats: monthlyStatsFormatted,
      recentEvents: (recentEvents as RecentEvent[]).map((event) => ({
        id: event.id,
        eventType: event.eventType,
        profileHandle: event.profile?.handle,
        metadata: event.metadataJson,
        timestamp: event.createdAt.toISOString(),
      })),
      profilePerformance,
      topProfile: profilePerformance[0],
      timeframes: {
        weekly: {
          start: sevenDaysAgo.toISOString(),
          end: now.toISOString(),
        },
        monthly: {
          start: thirtyDaysAgo.toISOString(),
          end: now.toISOString(),
        },
      },
    });

  } catch (error) {
    console.error('Error getting dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
