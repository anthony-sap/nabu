import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";

/**
 * Server-side Supabase client with service role key
 * Use this for server actions and API routes that need admin privileges
 * Note: Uses server-side env variables only (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 */
export function getServerSupabaseClient() {
  return createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Client-side Supabase client with anon key
 * DEPRECATED: Not used anymore - we use signed URLs instead
 * Keeping this function for backward compatibility but it's no longer needed
 */
export function getClientSupabaseClient() {
  throw new Error(
    "getClientSupabaseClient is deprecated. Use signed URLs from the backend instead."
  );
}

/**
 * Generate a signed upload URL for client-side uploads
 * @param storagePath - Full path in storage bucket (e.g., "{tenantId}/note-images/{noteId}/{filename}")
 * @param expiresIn - URL expiration time in seconds (default: 300 = 5 minutes)
 * @returns Signed URL for upload
 */
export async function generateSignedUploadUrl(
  storagePath: string,
  expiresIn: number = 300
): Promise<string> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase.storage
    .from("note-images")
    .createSignedUploadUrl(storagePath, {
      upsert: false, // Don't allow overwriting existing files
    });

  if (error) {
    throw new Error(`Failed to generate signed upload URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Get public URL for an uploaded file
 * @param storagePath - Full path in storage bucket
 * @returns Public URL
 */
export function getPublicUrl(storagePath: string): string {
  const supabase = getServerSupabaseClient();

  const { data } = supabase.storage.from("note-images").getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * Delete a file from storage
 * @param storagePath - Full path in storage bucket
 */
export async function deleteFile(storagePath: string): Promise<void> {
  const supabase = getServerSupabaseClient();

  const { error } = await supabase.storage
    .from("note-images")
    .remove([storagePath]);

  if (error) {
    throw new Error(`Failed to delete file from storage: ${error.message}`);
  }
}

/**
 * Upload a file directly (server-side)
 * Generally prefer signed URLs for client-side uploads, but this is useful for server operations
 * @param storagePath - Full path in storage bucket
 * @param file - File data (Buffer, Blob, or File)
 * @param contentType - MIME type
 */
export async function uploadFile(
  storagePath: string,
  file: Buffer | Blob | File,
  contentType: string
): Promise<string> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase.storage
    .from("note-images")
    .upload(storagePath, file, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  return getPublicUrl(data.path);
}

/**
 * Sanitize filename to remove special characters and ensure safe storage
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and keep only alphanumeric, dots, hyphens, and underscores
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .toLowerCase();
}

/**
 * Generate a unique filename with UUID prefix
 * @param originalFilename - Original filename from upload
 * @returns Unique filename: {uuid}-{sanitized-filename}
 */
export function generateUniqueFilename(originalFilename: string): string {
  const sanitized = sanitizeFilename(originalFilename);
  const uuid = crypto.randomUUID();
  return `${uuid}-${sanitized}`;
}

/**
 * Build storage path for a note image
 * @param tenantId - Tenant ID
 * @param noteId - Note ID
 * @param filename - Filename (should be unique)
 * @returns Full storage path
 */
export function buildStoragePath(
  tenantId: string,
  noteId: string,
  filename: string
): string {
  return `${tenantId}/note-images/${noteId}/${filename}`;
}

