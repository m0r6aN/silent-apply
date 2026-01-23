import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = {
  params: Promise<{ handle: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { handle } = await params;
    
    const profile = await prisma.profile.findUnique({
      where: { handle },
      include: {
        user: {
          select: {
            email: true,
          },
        },
        resumes: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (!profile.published) {
      return NextResponse.json({ error: "Profile not published" }, { status: 404 });
    }

    // Filter sensitive data based on visibility settings
    const visibility = profile.visibilityJson as Record<string, boolean>;
    const publicProfile = {
      id: profile.id,
      handle: profile.handle,
      headline: profile.headline,
      roles: profile.roles,
      locationMode: profile.locationMode,
      commuteMiles: profile.commuteMiles,
      workAuth: visibility.workAuth ? profile.workAuthJson : undefined,
      availability: profile.availabilityJson,
      comp: visibility.comp ? profile.compJson : undefined,
      proofLinks: profile.proofLinks,
      updatedAt: profile.updatedAt,
      resume: profile.resumes[0] ? {
        fileUrl: profile.resumes[0].fileUrl,
        createdAt: profile.resumes[0].createdAt,
      } : null,
    };

    return NextResponse.json(publicProfile);
  } catch (error) {
    console.error("Public profile fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
