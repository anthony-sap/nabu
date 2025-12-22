"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect, useRef } from "react";
import { $getRoot } from "lexical";
import type { MentionItem } from "./lexical-editor";

/**
 * Props for MentionSyncPlugin
 */
interface MentionSyncPluginProps {
  onMentionsChanged?: (mentions: MentionItem[]) => void;
}

/**
 * Plugin to track @mentions in real-time
 * Extracts all BeautifulMentionNode instances with trigger '@' and notifies parent
 */
export function MentionSyncPlugin({ onMentionsChanged }: MentionSyncPluginProps) {
  const [editor] = useLexicalComposerContext();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousMentionsRef = useRef<string>(""); // Store serialized mentions to detect changes

  useEffect(() => {
    if (!onMentionsChanged) return;

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
          const mentions: MentionItem[] = [];
          const seen = new Set<string>(); // Track unique mentions

          // Recursively traverse all nodes to find mentions with '@' trigger
          function traverse(node: any) {
            // Check if this is a BeautifulMentionNode with '@' trigger
            // Note: The type is "custom-beautifulMention" because we use createBeautifulMentionNode with a custom component
            if ((node.__type === "custom-beautifulMention" || node.__type === "beautifulMention") && node.__trigger === "@") {
              const mentionId = node.__data?.id;
              const mentionValue = node.__value || "";
              const mentionType = node.__data?.type || "note";

              // Only add unique mentions (by id)
              if (mentionId && !seen.has(mentionId)) {
                seen.add(mentionId);
                mentions.push({
                  id: mentionId,
                  value: mentionValue,
                  type: mentionType as "note" | "folder" | "thought",
                });
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

          // Only notify if mentions have changed
          const currentMentionsStr = JSON.stringify(mentions);
          if (currentMentionsStr !== previousMentionsRef.current) {
            previousMentionsRef.current = currentMentionsStr;
            onMentionsChanged(mentions);
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
  }, [editor, onMentionsChanged]);

  return null;
}

