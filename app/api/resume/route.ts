import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// For PDF parsing
import pdfParse from "pdf-parse";
// For DOCX parsing
import mammoth from "mammoth";

const UPLOAD_DIR = join(process.cwd(), "uploads", "resumes");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
];

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
      return NextResponse.json(
        { error: "Please create a profile first" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload PDF or DOCX" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.type.includes("pdf") ? "pdf" :
                     file.type.includes("wordprocessingml") ? "docx" : "doc";
    const filename = `${profile.id}_${timestamp}.${extension}`;
    const filepath = join(UPLOAD_DIR, filename);

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    // Parse file content
    let parsedText = "";
    
    if (file.type === "application/pdf") {
      try {
        const pdfData = await pdfParse(buffer);
        parsedText = pdfData.text;
      } catch (pdfError) {
        console.error("PDF parsing error:", pdfError);
        parsedText = "[PDF content could not be extracted]"
      }
    } else {
      // For DOCX/DOC files
      try {
        const result = await mammoth.extractRawText({ buffer });
        parsedText = result.value;
        
        // Add warnings if any
        if (result.messages.length > 0) {
          console.warn("DOCX parsing warnings:", result.messages);
        }
      } catch (docxError) {
        console.error("DOCX parsing error:", docxError);
        parsedText = "[DOCX content could not be extracted]"
      }
    }

    // Create resume record in database
    const resume = await prisma.resume.create({
      data: {
        profileId: profile.id,
        fileUrl: `/uploads/resumes/${filename}`,
        parsedText,
      },
    });

    // Create chunks for RAG (simplified version)
    const chunkSize = 1000; // characters
    const overlap = 200; // characters overlap
    const chunks: string[] = [];
    
    for (let i = 0; i < parsedText.length; i += chunkSize - overlap) {
      const chunk = parsedText.slice(i, i + chunkSize);
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
      }
    }

    // Save chunks to database
    for (const chunk of chunks) {
      await prisma.resumeChunk.create({
        data: {
          resumeId: resume.id,
          content: chunk,
          // embedding will be added later when we set up embeddings
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Resume uploaded successfully",
      resume: {
        id: resume.id,
        fileUrl: resume.fileUrl,
        parsedLength: parsedText.length,
        chunks: chunks.length,
      },
    });

  } catch (error) {
    console.error("Resume upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
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

    // Get user's resumes
    const resumes = await prisma.resume.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
      include: {
        chunks: {
          select: { id: true },
        },
      },
    });

    return NextResponse.json(resumes);
  } catch (error) {
    console.error("Resume fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
