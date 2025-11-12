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
 */
export function SourceUrlDisplayPlugin({ onSourceUrlsChanged }: SourceUrlDisplayPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Function to extract source URLs from editor state
    const extractSourceUrls = (): SourceInfo[] => {
      let sources: SourceInfo[] = [];
      
      editor.getEditorState().read(() => {
        const root = $getRoot();
        
        try {
          // Access the custom __sourceUrls property from root metadata
          const sourceUrls = (root as any).__sourceUrls;
          
          if (Array.isArray(sourceUrls)) {
            sources = sourceUrls.map(url => ({ url }));
          }
        } catch (error) {
          console.warn("Could not read sourceUrls from root:", error);
        }
      });
      
      return sources;
    };

    // Initial extraction
    const initialSources = extractSourceUrls();
    if (onSourceUrlsChanged) {
      onSourceUrlsChanged(initialSources);
    }

    // Listen for editor updates
    const removeUpdateListener = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot();
        
        try {
          const sourceUrls = (root as any).__sourceUrls;
          const sources: SourceInfo[] = Array.isArray(sourceUrls)
            ? sourceUrls.map(url => ({ url }))
            : [];
          
          if (onSourceUrlsChanged) {
            onSourceUrlsChanged(sources);
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

