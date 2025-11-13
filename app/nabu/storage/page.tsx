"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Trash2, FileImage, HardDrive } from "lucide-react";
import Link from "next/link";
import { formatFileSize } from "@/lib/image-compression";

/**
 * Storage statistics interface
 */
interface StorageStats {
  totalUsageBytes: number;
  totalUsageMB: number;
  totalUsageGB: number;
  totalImages: number;
  topFiles: Array<{
    id: string;
    filename: string;
    originalFilename: string;
    fileSize: number;
    fileSizeMB: number;
    mimeType: string;
    width: number | null;
    height: number | null;
    noteId: string;
    noteTitle: string;
    noteUrl: string;
    url: string | null;
    createdAt: string;
  }>;
}

/**
 * Storage Dashboard Page
 * Shows storage usage statistics and top files by size
 */
export default function StoragePage() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  /**
   * Load storage statistics
   */
  const loadStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/nabu/storage/stats");

      if (!response.ok) {
        throw new Error("Failed to load storage statistics");
      }

      const data = await response.json();
      setStats(data.data);
    } catch (error: any) {
      toast.error(error.message || "Failed to load storage statistics");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Delete an image
   */
  const handleDelete = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this image?")) {
      return;
    }

    try {
      setDeletingIds((prev) => new Set(prev).add(imageId));

      const response = await fetch(`/api/nabu/images/${imageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete image");
      }

      toast.success("Image deleted successfully");

      // Reload stats
      await loadStats();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete image");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
    }
  };

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-6">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>

          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load storage statistics</p>
          <Button onClick={loadStats} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Storage Management</h1>
        <p className="text-muted-foreground mt-2">
          Monitor your storage usage and manage image attachments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalUsageGB > 1
                ? `${stats.totalUsageGB.toFixed(2)} GB`
                : `${stats.totalUsageMB.toFixed(2)} MB`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatFileSize(stats.totalUsageBytes)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Images</CardTitle>
            <FileImage className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalImages}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Image attachments in notes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Size</CardTitle>
            <FileImage className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalImages > 0
                ? formatFileSize(Math.floor(stats.totalUsageBytes / stats.totalImages))
                : "0 Bytes"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per image</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Files Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Files by Size</CardTitle>
          <CardDescription>
            {stats.topFiles.length > 0
              ? `Showing ${stats.topFiles.length} largest files`
              : "No files to display"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.topFiles.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileImage className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No image attachments found</p>
              <p className="text-sm mt-2">
                Upload images to your notes to see them here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.topFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Thumbnail or placeholder */}
                  <div className="flex-shrink-0">
                    {file.url ? (
                      <img
                        src={file.url}
                        alt={file.originalFilename}
                        className="w-20 h-20 object-cover rounded border"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-muted rounded border flex items-center justify-center">
                        <FileImage className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{file.originalFilename}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{formatFileSize(file.fileSize)}</span>
                      {file.width && file.height && (
                        <span>
                          {file.width} × {file.height}
                        </span>
                      )}
                      <span>{file.mimeType}</span>
                    </div>
                    <Link
                      href={file.noteUrl}
                      className="text-sm text-primary hover:underline mt-1 inline-block"
                    >
                      {file.noteTitle}
                    </Link>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(file.id)}
                      disabled={deletingIds.has(file.id)}
                    >
                      {deletingIds.has(file.id) ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Deleting...
                        </span>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

