import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getOrCreateCorrelationId, createCorrelationLogger, CORRELATION_HEADER } from "@/lib/correlation";
import { recordResumeParseGovernance } from "@/lib/keon/governance";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { join } from "path";

const UPLOAD_DIR = join(process.cwd(), "uploads", "resumes");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
} as const;

type AllowedMimeType = keyof typeof ALLOWED_TYPES;

function isAllowedMimeType(type: string): type is AllowedMimeType {
  return type in ALLOWED_TYPES;
}

async function parseResume(filepath: string, fileType: string): Promise<string> {
  try {
    if (fileType === "pdf") {
      const { PDFParse } = await import("pdf-parse");
      const { readFile } = await import("fs/promises");
      const buffer = await readFile(filepath);
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      return result.text ?? "";
    }
    if (fileType === "docx") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ path: filepath });
      return result.value ?? "";
    }
  } catch (err) {
    console.error("[resume] parse failed", err);
  }
  return "";
}

function chunkText(text: string, chunkSize = 500): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = "";
  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length > chunkSize) {
      if (current.trim()) chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 20);
}

export async function POST(request: NextRequest) {
  const correlationId = await getOrCreateCorrelationId();
  const log = createCorrelationLogger(correlationId);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { [CORRELATION_HEADER]: correlationId } });
    }

    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) {
      return NextResponse.json({ error: "Profile not found. Create a profile before uploading a resume." }, { status: 400, headers: { [CORRELATION_HEADER]: correlationId } });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400, headers: { [CORRELATION_HEADER]: correlationId } });
    }
    if (!isAllowedMimeType(file.type)) {
      return NextResponse.json({ error: "Only PDF and DOCX files are accepted" }, { status: 400, headers: { [CORRELATION_HEADER]: correlationId } });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB" }, { status: 400, headers: { [CORRELATION_HEADER]: correlationId } });
    }

    const fileType = ALLOWED_TYPES[file.type];

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `${profile.id}_${timestamp}.${fileType}`;
    const filepath = join(UPLOAD_DIR, filename);
    const fileUrl = `/uploads/resumes/${filename}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    log.info("api.resume.file_saved", { filename });

    // Parse resume text locally
    const parsedText = await parseResume(filepath, fileType);
    const chunks = chunkText(parsedText);

    // Create resume record with parsed content
    const resume = await prisma.resume.create({
      data: {
        profileId: profile.id,
        fileUrl,
        parsedText,
        chunks: {
          create: chunks.map((content) => ({ content })),
        },
      },
    });

    log.info("api.resume.record_created", { resumeId: resume.id, chunkCount: chunks.length });

    // Record governance (non-blocking)
    recordResumeParseGovernance(profile.id, resume.id, correlationId).catch(() => {});

    return NextResponse.json(
      {
        success: true,
        resume: {
          id: resume.id,
          fileUrl: resume.fileUrl,
          parsedLength: parsedText.length,
          chunks: chunks.length,
          status: "ready",
        },
      },
      { status: 201, headers: { [CORRELATION_HEADER]: correlationId } }
    );
  } catch (error) {
    log.error("api.resume.error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: { [CORRELATION_HEADER]: correlationId } });
  }
}

export async function GET(request: NextRequest) {
  const correlationId = await getOrCreateCorrelationId();
  const log = createCorrelationLogger(correlationId);

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { [CORRELATION_HEADER]: correlationId } });
    }

    const profile = await prisma.profile.findFirst({ where: { userId: session.user.id } });
    if (!profile) {
      return NextResponse.json([], { headers: { [CORRELATION_HEADER]: correlationId } });
    }

    const resumes = await prisma.resume.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { chunks: true } } },
    });

    type ResumeRow = { id: string; fileUrl: string; createdAt: Date; parsedText: string; _count: { chunks: number } };
    const response = resumes.map((r: ResumeRow) => ({
      id: r.id,
      fileUrl: r.fileUrl,
      createdAt: r.createdAt,
      chunkCount: r._count.chunks,
      status: r.parsedText ? "ready" : "processing",
    }));

    log.info("api.resume.list_completed", { count: response.length });
    return NextResponse.json(response, { headers: { [CORRELATION_HEADER]: correlationId } });
  } catch (error) {
    log.error("api.resume.list_error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: { [CORRELATION_HEADER]: correlationId } });
  }
}
