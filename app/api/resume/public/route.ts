import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readResume } from "@/lib/storage";
import { generateCorrelationId } from "@/lib/correlation";
import { logResumeDownloaded } from "@/lib/observability";

export async function GET(request: NextRequest) {
  const correlationId = generateCorrelationId();
  const { searchParams } = new URL(request.url);
  const resumeId = searchParams.get("id");

  if (!resumeId) {
    return new NextResponse(null, { status: 404 });
  }

  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
    include: {
      profile: {
        select: { id: true, published: true, visibilityJson: true },
      },
    },
  });

  // Absent, unpublished, or download not enabled → silent 404
  if (!resume) return new NextResponse(null, { status: 404 });
  if (!resume.profile.published) return new NextResponse(null, { status: 404 });

  const visibility = resume.profile.visibilityJson as Record<string, unknown>;
  if (visibility.resume !== true) return new NextResponse(null, { status: 404 });

  const filename = resume.fileUrl.split("/").pop() ?? "resume";

  const buffer = await readResume(resume.fileUrl);
  if (!buffer) {
    return new NextResponse(null, { status: 404 });
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "bin";

  const contentTypes: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
  };

  logResumeDownloaded(resume.profile.id, correlationId, { resumeId }).catch(() => {});

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentTypes[ext] ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="resume.${ext}"`,
      "Cache-Control": "no-store",
    },
  });
}
