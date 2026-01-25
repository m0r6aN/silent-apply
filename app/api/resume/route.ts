import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getOrCreateCorrelationId, createCorrelationLogger, CORRELATION_HEADER } from "@/lib/omega/correlation";
import { dispatchTask } from "@/lib/omega/dispatch";
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

export async function POST(request: NextRequest) {
  const correlationId = await getOrCreateCorrelationId();
  const log = createCorrelationLogger(correlationId);

  log.info('api.resume.upload_started');

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      log.warn('api.resume.unauthorized');
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { [CORRELATION_HEADER]: correlationId } }
      );
    }

    log.info('api.resume.authenticated', { userId: session.user.id });

    // Find user's profile
    const profile = await prisma.profile.findFirst({
      where: { userId: session.user.id },
    });

    if (!profile) {
      log.warn('api.resume.no_profile', { userId: session.user.id });
      return NextResponse.json(
        { error: "Please create a profile first" },
        { status: 400, headers: { [CORRELATION_HEADER]: correlationId } }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      log.warn('api.resume.no_file');
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400, headers: { [CORRELATION_HEADER]: correlationId } }
      );
    }

    // Validate file type
    if (!isAllowedMimeType(file.type)) {
      log.warn('api.resume.invalid_type', { mimeType: file.type });
      return NextResponse.json(
        { error: "Invalid file type. Please upload PDF or DOCX" },
        { status: 400, headers: { [CORRELATION_HEADER]: correlationId } }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      log.warn('api.resume.too_large', { size: file.size });
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400, headers: { [CORRELATION_HEADER]: correlationId } }
      );
    }

    const fileType = ALLOWED_TYPES[file.type];
    log.info('api.resume.file_validated', {
      profileId: profile.id,
      fileType,
      size: file.size
    });

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${profile.id}_${timestamp}.${fileType}`;
    const filepath = join(UPLOAD_DIR, filename);
    const fileUrl = `/uploads/resumes/${filename}`;

    // Save file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    log.info('api.resume.file_saved', { filename, filepath });

    // Create resume record (parsedText will be filled by OMEGA task)
    const resume = await prisma.resume.create({
      data: {
        profileId: profile.id,
        fileUrl,
        parsedText: "", // Populated by resume.ingest task
      },
    });

    log.info('api.resume.record_created', { resumeId: resume.id });

    // Dispatch OMEGA task for async processing (fire-and-forget)
    // The task will parse the document and create chunks
    const dispatchResult = await dispatchTask(
      'resume.ingest',
      {
        profileId: profile.id,
        resumeId: resume.id,
        fileUrl: `file://${filepath}`, // Local file URL for parsing
        fileType,
      },
      correlationId
    );

    log.info('api.resume.task_dispatched', {
      resumeId: resume.id,
      taskId: dispatchResult.taskId
    });

    // Return immediately - processing happens async
    return NextResponse.json(
      {
        success: true,
        message: "Resume uploaded. Processing in background.",
        resume: {
          id: resume.id,
          fileUrl: resume.fileUrl,
          status: "processing",
        },
      },
      {
        status: 202, // Accepted
        headers: { [CORRELATION_HEADER]: correlationId }
      }
    );

  } catch (error) {
    log.error('api.resume.error', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: { [CORRELATION_HEADER]: correlationId } }
    );
  }
}

export async function GET(request: NextRequest) {
  const correlationId = await getOrCreateCorrelationId();
  const log = createCorrelationLogger(correlationId);

  log.info('api.resume.list_started');

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { [CORRELATION_HEADER]: correlationId } }
      );
    }

    // Find user's profile
    const profile = await prisma.profile.findFirst({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404, headers: { [CORRELATION_HEADER]: correlationId } }
      );
    }

    // Get user's resumes with chunk counts
    const resumes = await prisma.resume.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { chunks: true }
        }
      },
    });

    const response = resumes.map(r => ({
      id: r.id,
      fileUrl: r.fileUrl,
      createdAt: r.createdAt,
      chunkCount: r._count.chunks,
      status: r.parsedText ? 'ready' : 'processing'
    }));

    log.info('api.resume.list_completed', { count: response.length });

    return NextResponse.json(response, {
      headers: { [CORRELATION_HEADER]: correlationId }
    });

  } catch (error) {
    log.error('api.resume.list_error', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: { [CORRELATION_HEADER]: correlationId } }
    );
  }
}
