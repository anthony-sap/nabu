"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { $getRoot } from "lexical";

/**
 * Source URL information
 */
export interface SourceInfo {
  url: string;
}

/**
 * Props for the SourceUrlDisplayPlugin
 */
interface SourceUrlDisplayPluginProps {
  onSourceUrlsChanged?: (sources: SourceInfo[]) => void;
}

/**
 * Plugin to extract and monitor source URLs from editor root metadata
 * Notifies parent component when source URLs change
 * Preserves source URLs across all editor updates
 */
export function SourceUrlDisplayPlugin({ onSourceUrlsChanged }: SourceUrlDisplayPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Keep track of source URLs in closure to preserve across updates
    let currentSourceUrls: string[] = [];

    // Function to extract source URLs from editor state
    const extractSourceUrls = (): SourceInfo[] => {
      let sources: SourceInfo[] = [];
      
      editor.getEditorState().read(() => {
        const root = $getRoot();
        
        try {
          // Access the custom __sourceUrls property from root metadata
          const sourceUrls = (root as any).__sourceUrls;
          
          if (Array.isArray(sourceUrls)) {
            currentSourceUrls = [...sourceUrls];
            sources = sourceUrls.map(url => ({ url }));
          }
        } catch (error) {
          console.warn("Could not read sourceUrls from root:", error);
        }
      });
      
      return sources;
    };

    // Function to restore source URLs to root if missing
    const ensureSourceUrlsPreserved = () => {
      if (currentSourceUrls.length > 0) {
        editor.update(() => {
          const root = $getRoot();
          const existingUrls = (root as any).__sourceUrls;
          
          // Only restore if they're missing
          if (!existingUrls || existingUrls.length === 0) {
            const writableRoot = root.getWritable() as any;
            writableRoot.__sourceUrls = [...currentSourceUrls];
          }
        }, { tag: 'preserve-source-urls' });
      }
    };

    // Initial extraction
    const initialSources = extractSourceUrls();
    if (onSourceUrlsChanged) {
      onSourceUrlsChanged(initialSources);
    }

    // Listen for editor updates
    const removeUpdateListener = editor.registerUpdateListener(({ editorState, tags }) => {
      // Skip if this is our own preservation update
      if (tags.has('preserve-source-urls')) {
        return;
      }

      editorState.read(() => {
        const root = $getRoot();
        
        try {
          const sourceUrls = (root as any).__sourceUrls;
          
          if (Array.isArray(sourceUrls) && sourceUrls.length > 0) {
            // Update our tracked list
            currentSourceUrls = [...sourceUrls];
            const sources: SourceInfo[] = sourceUrls.map(url => ({ url }));
            
            if (onSourceUrlsChanged) {
              onSourceUrlsChanged(sources);
            }
          } else if (currentSourceUrls.length > 0) {
            // Source URLs were lost, restore them
            ensureSourceUrlsPreserved();
            
            // Notify with preserved URLs
            if (onSourceUrlsChanged) {
              onSourceUrlsChanged(currentSourceUrls.map(url => ({ url })));
            }
          }
        } catch (error) {
          console.warn("Could not read sourceUrls on update:", error);
        }
      });
    });

    return () => {
      removeUpdateListener();
    };
  }, [editor, onSourceUrlsChanged]);

  return null;
}

