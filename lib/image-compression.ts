import imageCompression from "browser-image-compression";

/**
 * Configuration for image compression
 */
export const COMPRESSION_CONFIG = {
  maxSizeMB: 2, // Maximum file size in MB
  maxWidthOrHeight: 1920, // Maximum dimension (maintains aspect ratio)
  useWebWorker: true, // Use web worker for better performance
  fileType: "image/jpeg", // Default output format (can be overridden)
};

/**
 * Maximum allowed file size before compression (10MB)
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Supported image MIME types
 */
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml", // SVG support (no compression needed)
];

/**
 * Image metadata extracted during compression
 */
export interface ImageMetadata {
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
}

/**
 * Result of image compression
 */
export interface CompressionResult {
  file: File;
  metadata: ImageMetadata;
  wasCompressed: boolean; // True if compression was applied
}

/**
 * Validate if a file is a supported image type
 * @param file - File to validate
 * @returns True if file is a supported image
 */
export function isValidImageType(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(file.type);
}

/**
 * Validate if a file size is within allowed limits
 * @param file - File to validate
 * @returns True if file size is acceptable
 */
export function isValidFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE_BYTES;
}

/**
 * Check if a file is an SVG (vector graphic)
 * @param file - File to check
 * @returns True if file is SVG
 */
export function isSvgFile(file: File): boolean {
  return file.type === "image/svg+xml";
}

/**
 * Extract image dimensions from a file
 * @param file - Image file
 * @returns Promise with width and height
 */
async function extractImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for dimension extraction"));
    };

    img.src = url;
  });
}

/**
 * Compress an image file with validation and metadata extraction
 * @param file - Original image file
 * @returns Compressed file with metadata
 * @throws Error if file is invalid or compression fails
 */
export async function compressImage(file: File): Promise<CompressionResult> {
  // Validate file type
  if (!isValidImageType(file)) {
    throw new Error(
      `Unsupported file type: ${file.type}. Supported types: ${SUPPORTED_IMAGE_TYPES.join(", ")}`
    );
  }

  // Validate file size
  if (!isValidFileSize(file)) {
    throw new Error(
      `File size exceeds maximum allowed size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`
    );
  }

  // Skip compression for SVGs - they're vector graphics that don't benefit from compression
  if (isSvgFile(file)) {
    return {
      file,
      metadata: {
        width: 0, // SVGs don't have fixed dimensions - they scale infinitely
        height: 0,
        fileSize: file.size,
        mimeType: file.type,
      },
      wasCompressed: false,
    };
  }

  // Extract original dimensions (raster images only)
  const dimensions = await extractImageDimensions(file);

  // Determine if compression is needed
  const needsCompression =
    file.size > COMPRESSION_CONFIG.maxSizeMB * 1024 * 1024 ||
    dimensions.width > COMPRESSION_CONFIG.maxWidthOrHeight ||
    dimensions.height > COMPRESSION_CONFIG.maxWidthOrHeight;

  let compressedFile = file;
  let wasCompressed = false;

  if (needsCompression) {
    try {
      // Preserve original file type if possible
      const options = {
        ...COMPRESSION_CONFIG,
        fileType: file.type,
      };

      compressedFile = await imageCompression(file, options);
      wasCompressed = true;
    } catch (error) {
      console.error("Image compression failed:", error);
      // If compression fails, use original file
      compressedFile = file;
      wasCompressed = false;
    }
  }

  // Extract final dimensions (may have changed if compressed)
  const finalDimensions = wasCompressed
    ? await extractImageDimensions(compressedFile)
    : dimensions;

  return {
    file: compressedFile,
    metadata: {
      width: finalDimensions.width,
      height: finalDimensions.height,
      fileSize: compressedFile.size,
      mimeType: compressedFile.type,
    },
    wasCompressed,
  };
}

/**
 * Format file size to human-readable format
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Validate and prepare multiple images for upload
 * @param files - Array of files to process
 * @returns Array of compression results
 */
export async function compressMultipleImages(
  files: File[]
): Promise<CompressionResult[]> {
  const results: CompressionResult[] = [];

  for (const file of files) {
    try {
      const result = await compressImage(file);
      results.push(result);
    } catch (error) {
      console.error(`Failed to process ${file.name}:`, error);
      // Continue with other files, don't throw
    }
  }

  return results;
}

