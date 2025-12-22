import { useState, useCallback } from "react";
import { compressImage, type CompressionResult } from "@/lib/image-compression";

/**
 * Upload state
 */
export interface UploadState {
  isUploading: boolean;
  progress: number; // 0-100
  error: string | null;
}

/**
 * Upload result
 */
export interface UploadResult {
  imageId: string;
  url: string;
  storagePath: string;
}

/**
 * Hook for handling image uploads with compression and direct-to-storage upload
 */
export function useImageUpload(noteId: string) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });

  /**
   * Upload a single image file
   */
  const uploadImage = useCallback(
    async (file: File): Promise<UploadResult> => {
      try {
        setUploadState({
          isUploading: true,
          progress: 10,
          error: null,
        });

        // Step 1: Compress image (20% progress)
        // Note: SVGs are not compressed (they're vector graphics and don't benefit from it)
        let compressionResult: CompressionResult;
        try {
          compressionResult = await compressImage(file);
          setUploadState((prev) => ({ ...prev, progress: 20 }));
        } catch (compressionError: any) {
          throw new Error(`Image compression failed: ${compressionError.message}`);
        }

        const { file: compressedFile, metadata } = compressionResult;

        // Step 2: Request signed upload URL from API (30% progress)
        const uploadUrlResponse = await fetch("/api/nabu/images/upload-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            noteId,
            filename: file.name,
            fileSize: metadata.fileSize,
            mimeType: metadata.mimeType,
            width: metadata.width,
            height: metadata.height,
          }),
        });

        if (!uploadUrlResponse.ok) {
          const errorData = await uploadUrlResponse.json();
          throw new Error(errorData.error || "Failed to get upload URL");
        }

        const uploadUrlData = await uploadUrlResponse.json();
        const { uploadUrl, imageId, storagePath } = uploadUrlData.data;

        setUploadState((prev) => ({ ...prev, progress: 30 }));

        // Step 3: Upload directly to Supabase storage using signed URL (70% progress)
        // No Supabase client needed - just use plain fetch with the signed URL
        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: compressedFile,
          headers: {
            "Content-Type": metadata.mimeType,
            "x-upsert": "false", // Prevent overwriting
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Storage upload failed: ${uploadResponse.statusText}`);
        }

        setUploadState((prev) => ({ ...prev, progress: 70 }));

        // Step 4: Confirm upload with API (90% progress)
        const confirmResponse = await fetch(`/api/nabu/images/${imageId}/confirm`, {
          method: "POST",
        });

        if (!confirmResponse.ok) {
          const errorData = await confirmResponse.json();
          throw new Error(errorData.error || "Failed to confirm upload");
        }

        const confirmData = await confirmResponse.json();
        const { url } = confirmData.data;

        setUploadState({
          isUploading: false,
          progress: 100,
          error: null,
        });

        return {
          imageId,
          url,
          storagePath,
        };
      } catch (error: any) {
        const errorMessage = error.message || "Upload failed";
        setUploadState({
          isUploading: false,
          progress: 0,
          error: errorMessage,
        });
        throw error;
      }
    },
    [noteId]
  );

  /**
   * Upload multiple images
   */
  const uploadMultipleImages = useCallback(
    async (files: File[]): Promise<UploadResult[]> => {
      const results: UploadResult[] = [];
      const errors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        try {
          const result = await uploadImage(files[i]);
          results.push(result);
        } catch (error: any) {
          errors.push(`${files[i].name}: ${error.message}`);
        }
      }

      if (errors.length > 0 && results.length === 0) {
        throw new Error(`All uploads failed:\n${errors.join("\n")}`);
      }

      return results;
    },
    [uploadImage]
  );

  /**
   * Reset upload state
   */
  const resetState = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
    });
  }, []);

  return {
    uploadState,
    uploadImage,
    uploadMultipleImages,
    resetState,
  };
}

