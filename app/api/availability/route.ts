/**
 * Candidate availability API.
 *
 * GET  /api/availability — list the signed-in candidate's weekly windows
 * PUT  /api/availability — replace the full set of weekly windows
 *
 * Windows are minutes-from-midnight in UTC. The booking API (GET /api/booking)
 * generates bookable slots from these windows. Calm by design: availability is
 * optional and carries no urgency.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const windowSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startMinute: z.number().int().min(0).max(1440),
    endMinute: z.number().int().min(0).max(1440),
  })
  .refine((w) => w.endMinute > w.startMinute, {
    message: "endMinute must be after startMinute",
  });

const putSchema = z.object({
  windows: z.array(windowSchema).max(50),
});

async function getOwnedProfile(userId: string) {
  return prisma.profile.findFirst({ where: { userId } });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getOwnedProfile(session.user.id);
  if (!profile) {
    return NextResponse.json({ windows: [] });
  }

  const windows = await prisma.availabilityWindow.findMany({
    where: { profileId: profile.id },
    orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
    select: { id: true, dayOfWeek: true, startMinute: true, endMinute: true },
  });

  return NextResponse.json({ windows });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getOwnedProfile(session.user.id);
  if (!profile) {
    return NextResponse.json(
      { error: "Create a profile before setting availability." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  const validation = putSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validation.error.format() },
      { status: 400 }
    );
  }

  const { windows } = validation.data;

  // Replace the full set atomically.
  await prisma.$transaction([
    prisma.availabilityWindow.deleteMany({ where: { profileId: profile.id } }),
    prisma.availabilityWindow.createMany({
      data: windows.map((w) => ({
        profileId: profile.id,
        dayOfWeek: w.dayOfWeek,
        startMinute: w.startMinute,
        endMinute: w.endMinute,
      })),
    }),
  ]);

  const saved = await prisma.availabilityWindow.findMany({
    where: { profileId: profile.id },
    orderBy: [{ dayOfWeek: "asc" }, { startMinute: "asc" }],
    select: { id: true, dayOfWeek: true, startMinute: true, endMinute: true },
  });

  return NextResponse.json({ windows: saved });
}
