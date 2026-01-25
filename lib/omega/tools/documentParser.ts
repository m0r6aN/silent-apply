/**
 * Document Parser Tool
 *
 * Extracts text from PDF and DOCX files for resume processing.
 * Propagates correlation ID through all operations.
 */

import { createCorrelationLogger } from '../correlation';

export interface ParseResult {
  text: string;
  metadata: {
    pages?: number;
    wordCount: number;
  };
}

export interface ParseError {
  code: 'PARSE_FAILED' | 'UNSUPPORTED_FORMAT' | 'FILE_NOT_FOUND';
  message: string;
  retriable: false;
}

/**
 * Parse a document and extract text content
 */
export async function parseDocument(
  fileUrl: string,
  fileType: 'pdf' | 'docx',
  correlationId: string
): Promise<{ success: true; result: ParseResult } | { success: false; error: ParseError }> {
  const log = createCorrelationLogger(correlationId);

  log.info('document.parse_started', { fileUrl, fileType });

  try {
    let buffer: Buffer;

    // Handle local file:// URLs
    if (fileUrl.startsWith('file://')) {
      const fs = await import('fs/promises');
      const filePath = fileUrl.replace('file://', '');
      try {
        buffer = await fs.readFile(filePath);
        log.info('document.file_read', { filePath, size: buffer.length });
      } catch (err) {
        log.error('document.file_read_failed', err, { filePath });
        return {
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: `File not found: ${filePath}`,
            retriable: false
          }
        };
      }
    } else {
      // Fetch remote file
      const response = await fetch(fileUrl);
      if (!response.ok) {
        log.error('document.fetch_failed', new Error(`HTTP ${response.status}`), { fileUrl });
        return {
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: `Failed to fetch file: HTTP ${response.status}`,
            retriable: false
          }
        };
      }
      buffer = Buffer.from(await response.arrayBuffer());
    }

    let text: string;
    let pages: number | undefined;

    if (fileType === 'pdf') {
      const result = await parsePdf(buffer, correlationId);
      if (!result.success) return result;
      text = result.result.text;
      pages = result.result.pages;
    } else if (fileType === 'docx') {
      const result = await parseDocx(buffer, correlationId);
      if (!result.success) return result;
      text = result.result.text;
    } else {
      return {
        success: false,
        error: {
          code: 'UNSUPPORTED_FORMAT',
          message: `Unsupported file type: ${fileType}`,
          retriable: false
        }
      };
    }

    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

    log.info('document.parse_completed', {
      fileType,
      wordCount,
      pages
    });

    return {
      success: true,
      result: {
        text,
        metadata: { pages, wordCount }
      }
    };
  } catch (err) {
    log.error('document.parse_failed', err, { fileType });
    return {
      success: false,
      error: {
        code: 'PARSE_FAILED',
        message: err instanceof Error ? err.message : 'Unknown parse error',
        retriable: false
      }
    };
  }
}

/**
 * Parse PDF using pdf-parse
 */
async function parsePdf(
  buffer: Buffer,
  correlationId: string
): Promise<{ success: true; result: { text: string; pages: number } } | { success: false; error: ParseError }> {
  const log = createCorrelationLogger(correlationId);

  try {
    // Dynamic import to avoid issues if package not installed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfParseModule = await import('pdf-parse') as any;
    const pdfParse = pdfParseModule.default || pdfParseModule;
    const data = await pdfParse(buffer);

    log.info('document.pdf_parsed', { pages: data.numpages });

    return {
      success: true,
      result: {
        text: data.text,
        pages: data.numpages
      }
    };
  } catch (err) {
    log.error('document.pdf_parse_error', err);
    return {
      success: false,
      error: {
        code: 'PARSE_FAILED',
        message: `PDF parse failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        retriable: false
      }
    };
  }
}

/**
 * Parse DOCX using mammoth
 */
async function parseDocx(
  buffer: Buffer,
  correlationId: string
): Promise<{ success: true; result: { text: string } } | { success: false; error: ParseError }> {
  const log = createCorrelationLogger(correlationId);

  try {
    // Dynamic import to avoid issues if package not installed
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });

    log.info('document.docx_parsed', { textLength: result.value.length });

    return {
      success: true,
      result: {
        text: result.value
      }
    };
  } catch (err) {
    log.error('document.docx_parse_error', err);
    return {
      success: false,
      error: {
        code: 'PARSE_FAILED',
        message: `DOCX parse failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        retriable: false
      }
    };
  }
}
