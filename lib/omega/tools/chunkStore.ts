/**
 * Chunk Store Tool
 *
 * Stores parsed resume text as chunks for Q&A retrieval.
 * Propagates correlation ID through all operations.
 */

import { prisma } from '@/lib/prisma';
import { createCorrelationLogger } from '../correlation';

export interface Chunk {
  content: string;
  index: number;
}

export interface ChunkStoreResult {
  chunkCount: number;
  chunkIds: string[];
}

export interface ChunkStoreError {
  code: 'STORAGE_ERROR' | 'RESUME_NOT_FOUND';
  message: string;
  retriable: boolean;
}

/**
 * Split text into chunks for storage
 *
 * Strategy: Split by paragraphs, merge small ones, split large ones
 * Target: ~500 tokens per chunk (roughly 2000 chars)
 */
export function createChunks(text: string): Chunk[] {
  const TARGET_SIZE = 2000;
  const MIN_SIZE = 500;
  const MAX_SIZE = 3000;

  // Split by double newlines (paragraphs)
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const chunks: Chunk[] = [];
  let currentChunk = '';
  let index = 0;

  for (const para of paragraphs) {
    // If adding this paragraph exceeds max, flush current
    if (currentChunk.length + para.length > MAX_SIZE && currentChunk.length >= MIN_SIZE) {
      chunks.push({ content: currentChunk.trim(), index: index++ });
      currentChunk = '';
    }

    // If paragraph itself is too large, split it
    if (para.length > MAX_SIZE) {
      if (currentChunk.length > 0) {
        chunks.push({ content: currentChunk.trim(), index: index++ });
        currentChunk = '';
      }

      // Split large paragraph by sentences
      const sentences = para.split(/(?<=[.!?])\s+/);
      let sentenceChunk = '';

      for (const sentence of sentences) {
        if (sentenceChunk.length + sentence.length > TARGET_SIZE && sentenceChunk.length >= MIN_SIZE) {
          chunks.push({ content: sentenceChunk.trim(), index: index++ });
          sentenceChunk = '';
        }
        sentenceChunk += (sentenceChunk ? ' ' : '') + sentence;
      }

      if (sentenceChunk.length > 0) {
        currentChunk = sentenceChunk;
      }
    } else {
      // Normal paragraph - add to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + para;

      // If we've reached target size, flush
      if (currentChunk.length >= TARGET_SIZE) {
        chunks.push({ content: currentChunk.trim(), index: index++ });
        currentChunk = '';
      }
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({ content: currentChunk.trim(), index: index });
  }

  return chunks;
}

/**
 * Store chunks in the database
 */
export async function storeChunks(
  resumeId: string,
  chunks: Chunk[],
  correlationId: string
): Promise<{ success: true; result: ChunkStoreResult } | { success: false; error: ChunkStoreError }> {
  const log = createCorrelationLogger(correlationId);

  log.info('chunks.store_started', { resumeId, chunkCount: chunks.length });

  try {
    // Verify resume exists
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId }
    });

    if (!resume) {
      log.warn('chunks.resume_not_found', { resumeId });
      return {
        success: false,
        error: {
          code: 'RESUME_NOT_FOUND',
          message: `Resume not found: ${resumeId}`,
          retriable: false
        }
      };
    }

    // Delete existing chunks (idempotency)
    await prisma.resumeChunk.deleteMany({
      where: { resumeId }
    });

    // Create new chunks
    const createdChunks = await prisma.$transaction(
      chunks.map(chunk =>
        prisma.resumeChunk.create({
          data: {
            resumeId,
            content: chunk.content
          },
          select: { id: true }
        })
      )
    );

    const chunkIds = createdChunks.map(c => c.id);

    // Log each chunk creation for auditability
    for (let i = 0; i < chunkIds.length; i++) {
      log.info('chunks.chunk_created', {
        resumeId,
        chunkId: chunkIds[i],
        chunkIndex: i,
        contentLength: chunks[i].content.length
      });
    }

    log.info('chunks.store_completed', { resumeId, chunkCount: chunkIds.length });

    return {
      success: true,
      result: {
        chunkCount: chunkIds.length,
        chunkIds
      }
    };
  } catch (err) {
    log.error('chunks.store_failed', err, { resumeId });
    return {
      success: false,
      error: {
        code: 'STORAGE_ERROR',
        message: err instanceof Error ? err.message : 'Database error',
        retriable: true
      }
    };
  }
}
