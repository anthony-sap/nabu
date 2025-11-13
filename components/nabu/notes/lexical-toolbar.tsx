"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
} from "lexical";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Indent,
  Outdent,
  Table,
  Code,
  Undo,
  Redo,
  Image,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCallback, useEffect, useState } from "react";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, INSERT_CHECK_LIST_COMMAND } from "@lexical/list";
import { $isHeadingNode } from "@lexical/rich-text";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { $createParagraphNode, $getRoot } from "lexical";
import { mergeRegister } from "@lexical/utils";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import { useRef } from "react";
import { toast } from "sonner";
import { useImageUpload } from "./use-image-upload";
import { INSERT_IMAGE_COMMAND } from "./lexical-image-plugin";

/**
 * Toolbar component for Lexical editor with comprehensive formatting controls
 */
export function LexicalToolbar({ noteId }: { noteId?: string }) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [blockType, setBlockType] = useState("paragraph");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, uploadState } = useImageUpload(noteId || "");

  /**
   * Insert link
   */
  const insertLink = useCallback(() => {
    if (!isLink) {
      const url = prompt("Enter URL:");
      if (url) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
      }
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink]);

  /**
   * Insert table
   */
  const insertTable = useCallback(() => {
    const rows = prompt("Number of rows:", "3");
    const cols = prompt("Number of columns:", "3");
    
    if (rows && cols) {
      editor.dispatchCommand(INSERT_TABLE_COMMAND, {
        rows: parseInt(rows, 10),
        columns: parseInt(cols, 10),
      });
    }
  }, [editor]);

  /**
   * Handle image file selection
   */
  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!noteId) {
      toast.error("Note ID is required for image uploads");
      return;
    }

    const file = files[0];
    const toastId = toast.loading("Uploading image...");

    try {
      const result = await uploadImage(file);
      
      // Dispatch command to insert image
      editor.dispatchCommand(INSERT_IMAGE_COMMAND, result);
      
      toast.success("Image uploaded successfully", { id: toastId });
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image", { id: toastId });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [editor, noteId, uploadImage]);

  /**
   * Trigger file input click
   */
  const triggerImageUpload = useCallback(() => {
    if (!noteId) {
      toast.error("Note ID is required for image uploads");
      return;
    }
    fileInputRef.current?.click();
  }, [noteId]);

  /**
   * Format as heading
   */
  const formatHeading = useCallback(
    (headingSize: "h1" | "h2" | "h3") => {
      if (blockType !== headingSize) {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode(headingSize));
          }
        });
      }
    },
    [blockType, editor]
  );

  /**
   * Format as paragraph
   */
  const formatParagraph = useCallback(() => {
    if (blockType !== "paragraph") {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createParagraphNode());
        }
      });
    }
  }, [blockType, editor]);

  /**
   * Format as quote
   */
  const formatQuote = useCallback(() => {
    if (blockType !== "quote") {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $setBlocksType(selection, () => $createQuoteNode());
        }
      });
    }
  }, [blockType, editor]);

  /**
   * Update toolbar state based on current selection
   */
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      // Update text format states
      setIsBold(selection.hasFormat("bold"));
      setIsItalic(selection.hasFormat("italic"));
      setIsUnderline(selection.hasFormat("underline"));
      setIsStrikethrough(selection.hasFormat("strikethrough"));

      // Check for link
      const node = selection.anchor.getNode();
      const parent = node.getParent();
      setIsLink($isLinkNode(parent) || $isLinkNode(node));

      // Check block type
      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === "root"
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();
      
      if ($isHeadingNode(element)) {
        const tag = element.getTag();
        setBlockType(tag);
      } else {
        const elementType = element.getType();
        setBlockType(elementType);
      }
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      })
    );
  }, [editor, updateToolbar]);

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/20">
      {/* History */}
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        title="Redo (Ctrl+Y)"
      >
        <Redo className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Block Type Formatting */}
      <Button
        size="sm"
        variant="ghost"
        className={`h-8 w-8 p-0 ${blockType === "h1" ? "bg-primary/20 text-primary" : ""}`}
        onClick={() => formatHeading("h1")}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className={`h-8 w-8 p-0 ${blockType === "h2" ? "bg-primary/20 text-primary" : ""}`}
        onClick={() => formatHeading("h2")}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className={`h-8 w-8 p-0 ${blockType === "h3" ? "bg-primary/20 text-primary" : ""}`}
        onClick={() => formatHeading("h3")}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className={`h-8 w-8 p-0 ${blockType === "quote" ? "bg-primary/20 text-primary" : ""}`}
        onClick={formatQuote}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Text Formatting */}
      <Button
        size="sm"
        variant="ghost"
        className={`h-8 w-8 p-0 ${isBold ? "bg-primary/20 text-primary" : ""}`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className={`h-8 w-8 p-0 ${isItalic ? "bg-primary/20 text-primary" : ""}`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className={`h-8 w-8 p-0 ${isUnderline ? "bg-primary/20 text-primary" : ""}`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className={`h-8 w-8 p-0 ${isStrikethrough ? "bg-primary/20 text-primary" : ""}`}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Lists */}
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
        title="Numbered List"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)}
        title="Check List"
      >
        <ListChecks className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Link */}
      <Button
        size="sm"
        variant="ghost"
        className={`h-8 w-8 p-0 ${isLink ? "bg-primary/20 text-primary" : ""}`}
        onClick={insertLink}
        title="Insert Link"
      >
        <Link className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Alignment */}
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left")}
        title="Align Left"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center")}
        title="Align Center"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right")}
        title="Align Right"
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify")}
        title="Justify"
      >
        <AlignJustify className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Indent */}
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}
        title="Outdent"
      >
        <Outdent className="h-4 w-4" />
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}
        title="Indent"
      >
        <Indent className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Table */}
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={insertTable}
        title="Insert Table"
      >
        <Table className="h-4 w-4" />
      </Button>

      {/* Image Upload */}
      {noteId && (
        <>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={triggerImageUpload}
            disabled={uploadState.isUploading}
            title="Insert Image"
          >
            <Image className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.svg"
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />
        </>
      )}
    </div>
  );
}

