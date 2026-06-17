import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { readResume } from "@/lib/storage";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get resume ID from query parameters
    const { searchParams } = new URL(request.url);
    const resumeId = searchParams.get("id");

    if (!resumeId) {
      return NextResponse.json(
        { error: "Resume ID is required" },
        { status: 400 }
      );
    }

    // Find the resume
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
      include: {
        profile: {
          select: { userId: true },
        },
      },
    });

    if (!resume) {
      return NextResponse.json(
        { error: "Resume not found" },
        { status: 404 }
      );
    }

    // Verify the resume belongs to the current user
    if (resume.profile.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized to access this resume" },
        { status: 403 }
      );
    }

    // Read the file from storage (Azure Blob in prod, local disk in dev)
    const fileBuffer = await readResume(resume.fileUrl);
    if (!fileBuffer) {
      return NextResponse.json(
        { error: "Resume file not found on server" },
        { status: 404 }
      );
    }

    // Determine content type based on file extension
    const extension = resume.fileUrl.split(".").pop()?.toLowerCase();
    let contentType = "application/octet-stream";
    
    if (extension === "pdf") {
      contentType = "application/pdf";
    } else if (extension === "docx") {
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else if (extension === "doc") {
      contentType = "application/msword";
    }

    // Create response with file
    const response = new NextResponse(new Uint8Array(fileBuffer));
    response.headers.set("Content-Type", contentType);
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="resume.${extension}"`
    );
    
    return response;

  } catch (error) {
    console.error("Resume download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
