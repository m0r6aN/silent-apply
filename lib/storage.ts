/**
 * Resume blob storage.
 *
 * Production uses Azure Blob Storage so uploads survive container restarts and
 * redeploys. If AZURE_STORAGE_CONNECTION_STRING is not set, falls back to the
 * local filesystem (`uploads/resumes/`) — acceptable only for local dev or a
 * host with a guaranteed-persistent volume mount.
 *
 * Configuration:
 *  - AZURE_STORAGE_CONNECTION_STRING  Storage account connection string
 *  - AZURE_STORAGE_CONTAINER          Container name (default: "resumes")
 *
 * The container is private. Downloads are always proxied server-side through
 * the resume routes so visibility gating (CANON) is enforced — blob URLs are
 * never handed to recruiters directly.
 */

import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const CONTAINER = process.env.AZURE_STORAGE_CONTAINER || "resumes";
const LOCAL_DIR = join(process.cwd(), "uploads", "resumes");

function blobConfigured(): boolean {
  return Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING);
}

async function getContainerClient() {
  const { BlobServiceClient } = await import("@azure/storage-blob");
  const service = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING as string
  );
  const container = service.getContainerClient(CONTAINER);
  await container.createIfNotExists();
  return container;
}

/**
 * Persist a resume file. Returns the value to store in Resume.fileUrl:
 *  - blob mode: the full HTTPS blob URL
 *  - local mode: a "/uploads/resumes/<filename>" path
 */
export async function saveResume(
  filename: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (blobConfigured()) {
    const container = await getContainerClient();
    const blob = container.getBlockBlobClient(filename);
    await blob.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
    return blob.url;
  }

  if (!existsSync(LOCAL_DIR)) {
    await mkdir(LOCAL_DIR, { recursive: true });
  }
  await writeFile(join(LOCAL_DIR, filename), buffer);
  return `/uploads/resumes/${filename}`;
}

/**
 * Read a resume file back by its stored fileUrl. Returns null if missing.
 */
export async function readResume(fileUrl: string): Promise<Buffer | null> {
  const filename = fileUrl.split("/").pop();
  if (!filename) return null;

  if (blobConfigured() && /^https?:\/\//i.test(fileUrl)) {
    try {
      const container = await getContainerClient();
      const blob = container.getBlockBlobClient(filename);
      if (!(await blob.exists())) return null;
      return await blob.downloadToBuffer();
    } catch (err) {
      console.error("[storage] blob download failed", err);
      return null;
    }
  }

  const filePath = join(LOCAL_DIR, filename);
  if (!existsSync(filePath)) return null;
  return readFile(filePath);
}
