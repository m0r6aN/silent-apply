import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user's profile
    const profile = await prisma.profile.findFirst({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Validate profile has required fields
    const requiredFields = ["headline", "roles", "locationMode", "workAuthJson", "availabilityJson"];
    const missingFields = requiredFields.filter(
      (field) => !profile[field as keyof typeof profile]
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: "Profile incomplete", 
          missingFields,
          message: "Please fill in all required fields before publishing" 
        },
        { status: 400 }
      );
    }

    // Publish profile
    const updatedProfile = await prisma.profile.update({
      where: { id: profile.id },
      data: { published: true, updatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Profile published successfully",
      profile: updatedProfile,
      publicUrl: `${process.env.NEXTAUTH_URL}/p/${updatedProfile.handle}`,
    });
  } catch (error) {
    console.error("Profile publish error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
