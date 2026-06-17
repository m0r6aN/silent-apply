import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const profileSchema = z.object({
  handle: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  headline: z.string().max(100).optional(),
  roles: z.array(z.string()).min(1),
  locationMode: z.enum(['remote', 'hybrid', 'onsite']),
  commuteMiles: z.number().min(0).max(100).optional(),
  workAuthJson: z.object({
    citizen: z.boolean(),
    visa: z.string().optional(),
    clearance: z.string().optional(),
  }),
  availabilityJson: z.object({
    startDate: z.string(),
    employmentType: z.enum(['full-time', 'contract', 'part-time']),
    noticePeriod: z.number().min(0).max(90),
  }),
  compJson: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
    currency: z.string().default('USD'),
    visible: z.boolean().default(false),
  }).optional(),
  proofLinks: z.array(z.object({
    type: z.enum(['github', 'linkedin', 'portfolio', 'certification', 'other']),
    url: z.string().url(),
    label: z.string(),
  })),
  visibilityJson: z.object({
    workAuth: z.boolean().default(false),
    compensation: z.boolean().default(false),
    contact: z.boolean().default(true),
    resume: z.boolean().default(false),
    booking: z.boolean().default(false),
  }),
});

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
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ profiles: user.profiles });
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = profileSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;
    
    // Check if handle is available
    const existingProfile = await prisma.profile.findUnique({
      where: { handle: data.handle },
    });
    
    if (existingProfile) {
      return NextResponse.json(
        { error: 'Handle already taken' },
        { status: 409 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create profile
    const profile = await prisma.profile.create({
      data: {
        userId: user.id,
        handle: data.handle,
        headline: data.headline,
        roles: data.roles,
        locationMode: data.locationMode,
        commuteMiles: data.commuteMiles,
        workAuthJson: data.workAuthJson,
        availabilityJson: data.availabilityJson,
        compJson: data.compJson,
        proofLinks: data.proofLinks,
        visibilityJson: data.visibilityJson,
        published: false,
      },
    });

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    console.error('Error creating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    // Allow partial updates — omit handle (handle cannot change after creation)
    const updateSchema = profileSchema.omit({ handle: true }).partial();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const existing = await prisma.profile.findFirst({ where: { userId: user.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const data = validation.data;
    const profile = await prisma.profile.update({
      where: { id: existing.id },
      data: {
        ...(data.headline !== undefined && { headline: data.headline }),
        ...(data.roles !== undefined && { roles: data.roles }),
        ...(data.locationMode !== undefined && { locationMode: data.locationMode }),
        ...(data.commuteMiles !== undefined && { commuteMiles: data.commuteMiles }),
        ...(data.workAuthJson !== undefined && { workAuthJson: data.workAuthJson }),
        ...(data.availabilityJson !== undefined && { availabilityJson: data.availabilityJson }),
        ...(data.compJson !== undefined && { compJson: data.compJson }),
        ...(data.proofLinks !== undefined && { proofLinks: data.proofLinks }),
        ...(data.visibilityJson !== undefined && { visibilityJson: data.visibilityJson }),
      },
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
