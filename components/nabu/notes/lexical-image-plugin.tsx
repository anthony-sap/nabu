"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useCallback } from "react";
import { 
  COMMAND_PRIORITY_EDITOR, 
  type LexicalCommand, 
  createCommand,
  KEY_DELETE_COMMAND,
  KEY_BACKSPACE_COMMAND,
  $getSelection,
  $isNodeSelection,
} from "lexical";
import { $insertNodes } from "lexical";
import { $createImageNode, CustomImageNode } from "./lexical-image-node";
import { useImageUpload, type UploadResult } from "./use-image-upload";
import { toast } from "sonner";

/**
 * Command to insert image
 */
export const INSERT_IMAGE_COMMAND: LexicalCommand<UploadResult> = createCommand();

/**
 * Command to delete image
 */
export const DELETE_IMAGE_COMMAND: LexicalCommand<string> = createCommand();

/**
 * Plugin props
 */
interface ImagePluginProps {
  noteId: string;
}

/**
 * Plugin for handling image uploads, drag-drop, and paste
 */
export function ImagePlugin({ noteId }: ImagePluginProps) {
  const [editor] = useLexicalComposerContext();
  const { uploadImage, uploadState } = useImageUpload(noteId);

  /**
   * Handle file drop or paste
   */
  const handleFiles = useCallback(
    async (files: File[]) => {
      // Filter for images only
      const imageFiles = files.filter((file) =>
        file.type.startsWith("image/")
      );

      if (imageFiles.length === 0) {
        return;
      }

      // Show loading toast
      const toastId = toast.loading(
        `Uploading ${imageFiles.length} image(s)...`
      );

      try {
        // Upload each image
        for (const file of imageFiles) {
          const result = await uploadImage(file);

          // Insert image node into editor
          editor.update(() => {
            const imageNode = $createImageNode({
              src: result.url,
              altText: file.name,
              imageId: result.imageId,
            });
            $insertNodes([imageNode]);
          });
        }

        toast.success("Image(s) uploaded successfully", { id: toastId });
      } catch (error: any) {
        toast.error(error.message || "Failed to upload image", { id: toastId });
      }
    },
    [editor, uploadImage]
  );

  /**
   * Handle drag and drop
   */
  useEffect(() => {
    const handleDragOver = (event: DragEvent) => {
      // Check if dragging files
      if (event.dataTransfer?.types.includes("Files")) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }
    };

    const handleDrop = async (event: DragEvent) => {
      // Check if dropping files
      if (event.dataTransfer?.files) {
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files);
        await handleFiles(files);
      }
    };

    const editorElement = editor.getRootElement();
    if (editorElement) {
      editorElement.addEventListener("dragover", handleDragOver);
      editorElement.addEventListener("drop", handleDrop);

      return () => {
        editorElement.removeEventListener("dragover", handleDragOver);
        editorElement.removeEventListener("drop", handleDrop);
      };
    }
  }, [editor, handleFiles]);

  /**
   * Handle paste
   */
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        event.preventDefault();
        await handleFiles(files);
      }
    };

    const editorElement = editor.getRootElement();
    if (editorElement) {
      editorElement.addEventListener("paste", handlePaste);

      return () => {
        editorElement.removeEventListener("paste", handlePaste);
      };
    }
  }, [editor, handleFiles]);

  /**
   * Register INSERT_IMAGE_COMMAND
   */
  useEffect(() => {
    return editor.registerCommand(
      INSERT_IMAGE_COMMAND,
      (payload: UploadResult) => {
        const imageNode = $createImageNode({
          src: payload.url,
          altText: "Uploaded image",
          imageId: payload.imageId,
        });
        $insertNodes([imageNode]);
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  /**
   * Register DELETE_IMAGE_COMMAND
   */
  useEffect(() => {
    return editor.registerCommand(
      DELETE_IMAGE_COMMAND,
      async (imageId: string) => {
        try {
          // Call API to delete image
          const response = await fetch(`/api/nabu/images/${imageId}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            throw new Error("Failed to delete image");
          }

          // Remove node from editor
          editor.update(() => {
            const nodes = editor._editorState._nodeMap;
            for (const [key, node] of nodes) {
              if (node instanceof CustomImageNode) {
                if (node.getImageId() === imageId) {
                  node.remove();
                }
              }
            }
          });

          toast.success("Image deleted successfully");
        } catch (error: any) {
          toast.error(error.message || "Failed to delete image");
        }

        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  /**
   * Register keyboard delete handler for Delete key
   */
  useEffect(() => {
    return editor.registerCommand(
      KEY_DELETE_COMMAND,
      (event) => {
        const selection = $getSelection();
        if ($isNodeSelection(selection)) {
          const nodes = selection.getNodes();
          for (const node of nodes) {
            if (node instanceof CustomImageNode) {
              event?.preventDefault();
              const imageId = node.getImageId();
              if (imageId && confirm("Delete this image?")) {
                // Delete via API and remove from editor
                fetch(`/api/nabu/images/${imageId}`, { method: "DELETE" })
                  .then((res) => {
                    if (res.ok) {
                      editor.update(() => {
                        node.remove();
                      });
                      toast.success("Image deleted");
                    } else {
                      toast.error("Failed to delete image");
                    }
                  })
                  .catch(() => {
                    toast.error("Failed to delete image");
                  });
              } else if (!imageId) {
                // No imageId, just remove from editor
                editor.update(() => {
                  node.remove();
                });
              }
              return true;
            }
          }
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  /**
   * Register keyboard delete handler for Backspace key
   */
  useEffect(() => {
    return editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        const selection = $getSelection();
        if ($isNodeSelection(selection)) {
          const nodes = selection.getNodes();
          for (const node of nodes) {
            if (node instanceof CustomImageNode) {
              event?.preventDefault();
              const imageId = node.getImageId();
              if (imageId && confirm("Delete this image?")) {
                // Delete via API and remove from editor
                fetch(`/api/nabu/images/${imageId}`, { method: "DELETE" })
                  .then((res) => {
                    if (res.ok) {
                      editor.update(() => {
                        node.remove();
                      });
                      toast.success("Image deleted");
                    } else {
                      toast.error("Failed to delete image");
                    }
                  })
                  .catch(() => {
                    toast.error("Failed to delete image");
                  });
              } else if (!imageId) {
                // No imageId, just remove from editor
                editor.update(() => {
                  node.remove();
                });
              }
              return true;
            }
          }
        }
        return false;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
}

