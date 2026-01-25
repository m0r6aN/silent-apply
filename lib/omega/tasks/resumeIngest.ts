/**
 * Resume Ingest Task
 *
 * OMEGA task that parses uploaded resumes, extracts text, and creates
 * searchable chunks for downstream Q&A retrieval.
 *
 * Correlation threading: API → Task → Parser → ChunkStore → Complete
 */

import { prisma } from '@/lib/prisma';
import { createCorrelationLogger } from '../correlation';
import { parseDocument } from '../tools/documentParser';
import { createChunks, storeChunks } from '../tools/chunkStore';

export interface ResumeIngestInput {
  correlationId: string;
  profileId: string;
  resumeId: string;
  fileUrl: string;
  fileType: 'pdf' | 'docx';
}

export interface ResumeIngestOutput {
  correlationId: string;
  status: 'success' | 'failure';
  resumeId?: string;
  chunkCount?: number;
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
}

/**
 * Execute the resume ingest task
 *
 * Steps:
 * 1. Parse document (PDF/DOCX → text)
 * 2. Create chunks from text
 * 3. Store chunks in database
 * 4. Update resume record with parsed text
 */
export async function executeResumeIngest(input: ResumeIngestInput): Promise<ResumeIngestOutput> {
  const { correlationId, profileId, resumeId, fileUrl, fileType } = input;
  const log = createCorrelationLogger(correlationId);

  log.info('task.resume_ingest.started', {
    profileId,
    resumeId,
    fileType
  });

  // Step 1: Parse document
  log.info('task.resume_ingest.step', { step: 'parse_document' });
  const parseResult = await parseDocument(fileUrl, fileType, correlationId);

  if (!parseResult.success) {
    log.error('task.resume_ingest.parse_failed', parseResult.error, { resumeId });
    return {
      correlationId,
      status: 'failure',
      error: parseResult.error
    };
  }

  const { text, metadata } = parseResult.result;
  log.info('task.resume_ingest.parsed', {
    resumeId,
    wordCount: metadata.wordCount,
    pages: metadata.pages
  });

  // Step 2: Create chunks
  log.info('task.resume_ingest.step', { step: 'create_chunks' });
  const chunks = createChunks(text);
  log.info('task.resume_ingest.chunks_created', {
    resumeId,
    chunkCount: chunks.length
  });

  // Step 3: Store chunks
  log.info('task.resume_ingest.step', { step: 'store_chunks' });
  const storeResult = await storeChunks(resumeId, chunks, correlationId);

  if (!storeResult.success) {
    log.error('task.resume_ingest.store_failed', storeResult.error, { resumeId });
    return {
      correlationId,
      status: 'failure',
      error: storeResult.error
    };
  }

  // Step 4: Update resume record with parsed text
  log.info('task.resume_ingest.step', { step: 'update_resume' });
  try {
    await prisma.resume.update({
      where: { id: resumeId },
      data: { parsedText: text }
    });
  } catch (err) {
    log.error('task.resume_ingest.update_failed', err, { resumeId });
    return {
      correlationId,
      status: 'failure',
      error: {
        code: 'STORAGE_ERROR',
        message: 'Failed to update resume record',
        retriable: true
      }
    };
  }

  // Complete
  log.info('task.resume_ingest.completed', {
    resumeId,
    chunkCount: storeResult.result.chunkCount
  });

  return {
    correlationId,
    status: 'success',
    resumeId,
    chunkCount: storeResult.result.chunkCount
  };
}
