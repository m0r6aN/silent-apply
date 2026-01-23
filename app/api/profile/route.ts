import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Validation schemas
const profileCreateSchema = z.object({
  handle: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  headline: z.string().max(200).optional(),
  roles: z.array(z.string()).min(1),
  locationMode: z.enum(["remote", "hybrid", "onsite"]),
  commuteMiles: z.number().int().min(0).max(100).optional(),
  workAuthJson: z.record(z.any()),
  availabilityJson: z.record(z.any()),
  compJson: z.record(z.any()).optional(),
  proofLinks: z.array(z.record(z.any())),
  visibilityJson: z.record(z.any()),
});

const profileUpdateSchema = profileCreateSchema.partial();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = profileCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
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
        { error: "Handle already taken" },
        { status: 409 }
      );
    }

    // Create profile
    const profile = await prisma.profile.create({
      data: {
        userId: session.user.id,
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
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(profile, { status: 201 });
  } catch (error) {
    console.error("Profile creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = profileUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const { handle, ...updateData } = data;

    // Find user's profile
    const profile = await prisma.profile.findFirst({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // If handle is being updated, check availability
    if (handle && handle !== profile.handle) {
      const existingProfile = await prisma.profile.findUnique({
        where: { handle },
      });

      if (existingProfile) {
        return NextResponse.json(
          { error: "Handle already taken" },
          { status: 409 }
        );
      }
    }

    // Update profile
    const updatedProfile = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        ...updateData,
        handle: handle || profile.handle,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
