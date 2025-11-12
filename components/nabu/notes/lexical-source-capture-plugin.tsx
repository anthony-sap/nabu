"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { PASTE_COMMAND, COMMAND_PRIORITY_LOW, $getRoot } from "lexical";

/**
 * Extract source URL from CF_HTML format
 * CF_HTML includes a header like: SourceURL:https://example.com
 */
function extractSourceUrlFromCFHtml(html: string): string | null {
  if (!html) return null;

  // 1) CF_HTML header style: lines including "SourceURL:..."
  const headerMatch = html.match(/SourceURL:(.+?)(\r?\n|$)/i);
  if (headerMatch) return headerMatch[1].trim();

  // 2) meta tag styles or attributes (rare but possible)
  const metaMatch =
    html.match(/<meta[^>]+name=["']?sourceurl["']?[^>]+content=["']([^"']+)["']/i) ||
    html.match(/SourceURL=["']([^"']+)["']/i);
  if (metaMatch) return metaMatch[1];

  // 3) fallback: first http(s) URL found in the HTML string (including localhost)
  const urlMatch = html.match(/https?:\/\/[^\s"'<>]+/i);
  return urlMatch ? urlMatch[0] : null;
}

/**
 * Extract URL from plain text
 */
function extractUrlFromPlainText(text: string): string | null {
  if (!text) return null;
  // Match http(s) URLs including localhost
  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  return urlMatch ? urlMatch[0] : null;
}

/**
 * Plugin to capture source URLs when content is pasted from HTML
 * Stores URLs in the editor root metadata for persistence
 */
export function SourceUrlCapturePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const removeCommand = editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        try {
          const clipboard = event?.clipboardData;
          if (!clipboard) return false;

          let sourceUrl: string | null = null;

          // Try HTML payload first (CF_HTML may be in this string)
          const html = clipboard.getData("text/html");
          sourceUrl = extractSourceUrlFromCFHtml(html);

          // If not found, try the URI list MIME type
          if (!sourceUrl) {
            const uriList = clipboard.getData("text/uri-list");
            if (uriList) {
              // text/uri-list may contain multiple lines; take first valid URL
              const match = uriList.match(/https?:\/\/[^\s]+/i);
              sourceUrl = match ? match[0] : null;
            }
          }

          // Fallback to plain text scan
          if (!sourceUrl) {
            const plain = clipboard.getData("text/plain");
            sourceUrl = extractUrlFromPlainText(plain);
          }

          // If we found a source URL, add it to root metadata
          if (sourceUrl) {
            // Schedule update after paste completes
            setTimeout(() => {
              editor.update(() => {
                const root = $getRoot();
                
                // Get or initialize sourceUrls array from root metadata
                let sourceUrls: string[] = [];
                try {
                  // Try to read from the root node's custom data
                  const rootData = (root as any).__sourceUrls;
                  if (rootData && Array.isArray(rootData)) {
                    sourceUrls = [...rootData];
                  }
                } catch (error) {
                  console.warn("Could not read existing sourceUrls:", error);
                }

                // Add new URL if not already present (deduplicate)
                if (!sourceUrls.includes(sourceUrl!)) {
                  sourceUrls.push(sourceUrl!);
                  
                  // Store back to root node
                  try {
                    const writableRoot = root.getWritable() as any;
                    writableRoot.__sourceUrls = sourceUrls;
                  } catch (error) {
                    console.error("Failed to store source URL:", error);
                  }
                }
              });
            }, 100);
          }
        } catch (err) {
          console.error("Paste handler error:", err);
        }

        // Return false to allow normal paste behavior
        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    return removeCommand;
  }, [editor]);

  return null;
}

