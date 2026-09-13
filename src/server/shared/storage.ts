import { createAdminClient } from "@/lib/supabase/admin";
import { BadRequestError } from "@/server/shared/errors";

const RECEIPTS_BUCKET = "receipts";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

let isBucketVerified = false;

/**
 * Ensures that the receipts storage bucket exists and is configured for public access.
 */
export async function ensureReceiptsBucket(): Promise<void> {
  if (isBucketVerified) return;

  const supabase = createAdminClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error("Failed to list storage buckets:", listError);
    return;
  }

  const exists = buckets?.some((b) => b.name === RECEIPTS_BUCKET);
  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(
      RECEIPTS_BUCKET,
      {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE_BYTES,
        allowedMimeTypes: Array.from(ALLOWED_MIME_TYPES),
      }
    );
    if (createError) {
      console.error("Failed to create receipts bucket:", createError);
      return;
    }
  }

  isBucketVerified = true;
}

export interface UploadReceiptResult {
  url: string;
  path: string;
  size: number;
  mimeType: string;
  originalName: string;
}

/**
 * Uploads a receipt image/document to Supabase storage.
 */
export async function uploadReceiptFile(
  fileBuffer: Buffer | Uint8Array,
  fileName: string,
  mimeType: string,
  poCode?: string
): Promise<UploadReceiptResult> {
  if (fileBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new BadRequestError(
      `File size exceeds 10MB limit (size: ${(fileBuffer.byteLength / 1024 / 1024).toFixed(1)}MB).`
    );
  }

  const normalizedMime = mimeType.toLowerCase().trim();
  if (normalizedMime && !ALLOWED_MIME_TYPES.has(normalizedMime)) {
    throw new BadRequestError(
      `Unsupported file type "${mimeType}". Allowed: JPG, PNG, WEBP, GIF, HEIC, PDF.`
    );
  }

  await ensureReceiptsBucket();

  const supabase = createAdminClient();
  const sanitizedPo = (poCode || "general")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .toLowerCase();
  const cleanOriginalName = fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .toLowerCase();
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const storagePath = `po-${sanitizedPo}/${uniquePrefix}-${cleanOriginalName}`;

  const { error: uploadError } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: normalizedMime || "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    console.error("Supabase storage upload error:", uploadError);
    throw new BadRequestError(
      `Failed to upload receipt image: ${uploadError.message}`
    );
  }

  const { data: urlData } = supabase.storage
    .from(RECEIPTS_BUCKET)
    .getPublicUrl(storagePath);

  return {
    url: urlData.publicUrl,
    path: storagePath,
    size: fileBuffer.byteLength,
    mimeType: normalizedMime,
    originalName: fileName,
  };
}

/**
 * Deletes a receipt from Supabase storage given its public URL or storage path.
 */
export async function deleteReceiptFile(urlOrPath: string): Promise<boolean> {
  if (!urlOrPath) return false;

  try {
    let path = urlOrPath;
    if (urlOrPath.includes(`/storage/v1/object/public/${RECEIPTS_BUCKET}/`)) {
      path = urlOrPath.split(
        `/storage/v1/object/public/${RECEIPTS_BUCKET}/`
      )[1];
    }

    const supabase = createAdminClient();
    const { error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .remove([path]);

    if (error) {
      console.warn("Could not remove file from storage:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Error deleting receipt file:", err);
    return false;
  }
}
