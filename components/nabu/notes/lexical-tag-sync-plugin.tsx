"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef } from "react";
import { $getRoot, $getNodeByKey } from "lexical";
import type { MentionItem } from "./lexical-editor";

/**
 * Props for TagSyncPlugin
 */
interface TagSyncPluginProps {
  onTagsChanged?: (tags: MentionItem[]) => void;
}

/**
 * Plugin to track #tag mentions in real-time
 * Extracts all BeautifulMentionNode instances with trigger '#' and notifies parent
 */
export function TagSyncPlugin({ onTagsChanged }: TagSyncPluginProps) {
  const [editor] = useLexicalComposerContext();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousTagsRef = useRef<string>(""); // Store serialized tags to detect changes

  useEffect(() => {
    if (!onTagsChanged) return;

    // Register update listener
    const removeUpdateListener = editor.registerUpdateListener(({ editorState }) => {
      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Debounce by 500ms
      timeoutRef.current = setTimeout(() => {
        editorState.read(() => {
          const root = $getRoot();
          const tags: MentionItem[] = [];
          const seen = new Set<string>(); // Track unique tags

          // Recursively traverse all nodes to find mentions with '#' trigger
          function traverse(node: any) {
            // Check if this is a BeautifulMentionNode with '#' trigger
            // Note: The type is "custom-beautifulMention" because we use createBeautifulMentionNode with a custom component
            if (node.__type === "custom-beautifulMention" || node.__type === "beautifulMention") {
              if (node.__trigger === "#") {
                const tagId = node.__data?.id;
                const tagValue = node.__value || "";
                const tagType = node.__data?.type || "tag";

                // Only add unique tags (by id or value)
                const uniqueKey = tagId || tagValue;
                if (uniqueKey && !seen.has(uniqueKey)) {
                  seen.add(uniqueKey);
                  tags.push({
                    id: tagId || tagValue, // Use value as fallback ID for new tags
                    value: tagValue,
                    type: tagType as "tag",
                  });
                }
              }
            }

            // Traverse children
            const children = node.getChildren?.();
            if (children) {
              children.forEach((child: any) => traverse(child));
            }
          }

          // Start traversal from root
          const children = root.getChildren();
          children.forEach((child) => traverse(child));

          // Only notify if tags have changed
          const currentTagsStr = JSON.stringify(tags);
          if (currentTagsStr !== previousTagsRef.current) {
            
            previousTagsRef.current = currentTagsStr;
            onTagsChanged(tags);
          }
        });
      }, 500);
    });

    return () => {
      removeUpdateListener();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [editor, onTagsChanged]);

  return null;
}

