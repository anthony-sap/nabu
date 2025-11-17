"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { HashtagPlugin } from "@lexical/react/LexicalHashtagPlugin";
import { AutoLinkPlugin } from "@lexical/react/LexicalAutoLinkPlugin";
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { TableOfContentsPlugin } from "@lexical/react/LexicalTableOfContentsPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { 
  BeautifulMentionsPlugin, 
  BeautifulMentionNode,
  createBeautifulMentionNode,
  type BeautifulMentionComponentProps,
  type BeautifulMentionsMenuProps,
  type BeautifulMentionsMenuItemProps,
} from "lexical-beautiful-mentions";
import { forwardRef } from "react";

import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode, AutoLinkNode } from "@lexical/link";

import { TableNode, TableCellNode, TableRowNode } from "@lexical/table";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import {
  HEADING,
  QUOTE,
  CODE,
  UNORDERED_LIST,
  ORDERED_LIST,
  CHECK_LIST,
  LINK,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
} from "@lexical/markdown";

import { $getRoot, $createParagraphNode, $createTextNode, EditorState, LexicalEditor as LexicalEditorType } from "lexical";
import { useEffect, useRef, useState, useCallback } from "react";
import { LexicalToolbar } from "./lexical-toolbar";
import { SourceUrlCapturePlugin } from "./lexical-source-capture-plugin";
import { SourceUrlDisplayPlugin, SourceInfo } from "./lexical-source-display-plugin";
import { TagSyncPlugin } from "./lexical-tag-sync-plugin";
import { MentionSyncPlugin } from "./lexical-mention-sync-plugin";
import { CustomImageNode } from "./lexical-image-node";
import { ImagePlugin } from "./lexical-image-plugin";
import { Link2, Hash, AtSign } from "lucide-react";

/**
 * Custom mention component with tooltip - shows trigger symbol
 */
const CustomMentionComponent = forwardRef<
  HTMLSpanElement,
  BeautifulMentionComponentProps
>(({ trigger, value, data, children, ...other }, ref) => {
  const Icon = trigger === "@" ? AtSign : trigger === "#" ? Hash : null;
  
  // Convert children to string and check if it starts with the trigger
  const childText = typeof children === 'string' ? children : value;
  const displayText = childText.startsWith(trigger) ? childText.slice(1) : childText;
  
  return (
    <span
      {...other}
      ref={ref}
      className="inline-flex items-center gap-0.5 text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/20 transition-colors"
      title={data?.description || `${trigger}${value}`}
    >
      {Icon && <Icon className="h-3 w-3 flex-shrink-0" />}
      {displayText}
    </span>
  );
});

CustomMentionComponent.displayName = "CustomMentionComponent";

/**
 * Custom menu component
 */
const CustomMenu = forwardRef<HTMLUListElement, BeautifulMentionsMenuProps>(
  ({ loading, ...props }, ref) => {
    return (
      <ul
        {...props}
        ref={ref}
        style={{
          position: 'fixed',
          zIndex: 99999,
        }}
        className="bg-card border-2 border-primary/40 rounded-lg shadow-2xl shadow-primary/30 overflow-hidden max-h-60 overflow-y-auto backdrop-blur-sm"
      />
    );
  }
);

CustomMenu.displayName = "CustomMenu";

/**
 * Custom menu item component
 */
const CustomMenuItem = forwardRef<HTMLLIElement, BeautifulMentionsMenuItemProps>(
  ({ selected, item, onClick, onMouseEnter, onMouseMove, role, id, "aria-selected": ariaSelected, ...rest }, ref) => {
    return (
      <li
        ref={ref}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseMove={onMouseMove}
        role={role}
        id={id}
        aria-selected={ariaSelected}
        className={`px-4 py-3 cursor-pointer transition-all text-sm border-b border-border/30 last:border-b-0 ${
          selected
            ? "bg-primary text-primary-foreground font-semibold shadow-sm"
            : "text-foreground hover:bg-primary/15 hover:text-primary"
        }`}
      >
        <div className="font-medium">{item.value}</div>
        {item.data?.description && (
          <div className={`text-xs truncate mt-0.5 ${selected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
            {item.data.description}
          </div>
        )}
      </li>
    );
  }
);

CustomMenuItem.displayName = "CustomMenuItem";

/**
 * Mention item structure for tracking
 */
export interface MentionItem {
  id: string;
  value: string;
  type: "note" | "folder" | "thought" | "tag";
}

/**
 * Link item representing a note-to-note link
 */
export interface LinkItem {
  id: string;
  toNoteId: string;
  toNoteTitle: string;
}

/**
 * Props for LexicalEditor component
 */
interface LexicalEditorProps {
  value?: string; // Plain text value for initial content
  editorState?: string; // Serialized editor state (JSON) - takes priority over value
  onChange: (plainText: string, serializedState: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  showToolbar?: boolean;
  noteId?: string; // Required for image uploads
  onSourceUrlsChanged?: (sources: SourceInfo[]) => void;
  onTagsChanged?: (tags: MentionItem[]) => void;
  onMentionsChanged?: (mentions: MentionItem[]) => void;
  editorRef?: React.MutableRefObject<LexicalEditorType | null>; // Ref to access editor instance
}

/**
 * Markdown transformers for paste and typing shortcuts
 */
const MARKDOWN_TRANSFORMERS = [
  HEADING,
  QUOTE,
  CODE,
  UNORDERED_LIST,
  ORDERED_LIST,
  CHECK_LIST,
  LINK,
  BOLD_ITALIC_STAR,
  BOLD_ITALIC_UNDERSCORE,
  BOLD_STAR,
  BOLD_UNDERSCORE,
  INLINE_CODE,
  ITALIC_STAR,
  ITALIC_UNDERSCORE,
  STRIKETHROUGH,
];

/**
 * URL matchers for AutoLinkPlugin
 * Includes support for localhost URLs
 */
const URL_MATCHER =
  /((https?:\/\/(www\.|localhost|127\.0\.0\.1))|(www\.))[-a-zA-Z0-9@:%._+~#=]{0,256}(\.[-a-zA-Z0-9()]{1,6})?\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const EMAIL_MATCHER =
  /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

const MATCHERS = [
  (text: string) => {
    const match = URL_MATCHER.exec(text);
    if (match === null) {
      return null;
    }
    const fullMatch = match[0];
    return {
      index: match.index,
      length: fullMatch.length,
      text: fullMatch,
      url: fullMatch.startsWith("http") ? fullMatch : `https://${fullMatch}`,
    };
  },
  (text: string) => {
    const match = EMAIL_MATCHER.exec(text);
    if (match === null) {
      return null;
    }
    const fullMatch = match[0];
    return {
      index: match.index,
      length: fullMatch.length,
      text: fullMatch,
      url: `mailto:${fullMatch}`,
    };
  },
];

/**
 * Custom Link Decorator Component - renders links with icon
 */
function CustomLinkComponent({ 
  nodeKey, 
  url, 
  children 
}: { 
  nodeKey: string; 
  url: string; 
  children: React.ReactNode;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/20 transition-colors no-underline"
      title={url}
    >
      <Link2 className="h-3 w-3 flex-shrink-0" />
      {children}
    </a>
  );
}

/**
 * Plugin to decorate link nodes with custom component
 */
function CustomLinkPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerDecoratorListener((decorators) => {
      // This ensures the editor re-renders when decorators change
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerNodeTransform(LinkNode, (node) => {
      // Links are already created by LinkPlugin and AutoLinkPlugin
      // We just need to ensure they render with our custom component
      // This is handled by the theme styling
    });
  }, [editor]);

  return null;
}

/**
 * Plugin to set and sync content
 */
function ContentSyncPlugin({ 
  plainText, 
  serializedState 
}: { 
  plainText?: string;
  serializedState?: string;
}) {
  const [editor] = useLexicalComposerContext();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Only set initial content on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      
      // Defer state updates to avoid flushSync warning
      queueMicrotask(() => {
        // Priority: serialized state > plain text
        if (serializedState) {
          try {
            const parsedState = editor.parseEditorState(serializedState);
            editor.setEditorState(parsedState);
            
            // Restore source URLs from serialized state to root node
            const stateJSON = JSON.parse(serializedState);
            if (stateJSON.root?.__sourceUrls) {
              editor.update(() => {
                const root = $getRoot();
                const writableRoot = root.getWritable() as any;
                writableRoot.__sourceUrls = stateJSON.root.__sourceUrls;
              });
            }
          } catch (error) {
            console.error("Failed to parse editor state:", error);
            // Fall back to plain text
            if (plainText) {
              editor.update(() => {
                const root = $getRoot();
                root.clear();
                const paragraph = $createParagraphNode();
                paragraph.append($createTextNode(plainText));
                root.append(paragraph);
              });
            }
          }
        } else if (plainText) {
          editor.update(() => {
            const root = $getRoot();
            root.clear();
            const paragraph = $createParagraphNode();
            paragraph.append($createTextNode(plainText));
            root.append(paragraph);
          });
        }
      });
    }
  }, [plainText, serializedState, editor]);

  return null;
}

/**
 * Custom AutoFocus Plugin with delay to ensure mentions plugin is initialized
 */
function DelayedAutoFocusPlugin({ shouldAutoFocus }: { shouldAutoFocus: boolean }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (shouldAutoFocus) {
      // Delay focus slightly to allow Beautiful Mentions plugin to initialize
      const timer = setTimeout(() => {
        editor.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [editor, shouldAutoFocus]);

  return null;
}

/**
 * Plugin to expose editor instance via ref
 */
function EditorRefPlugin({ editorRef }: { editorRef?: React.MutableRefObject<LexicalEditorType | null> }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
      return () => {
        editorRef.current = null;
      };
    }
  }, [editor, editorRef]);

  return null;
}

/**
 * Lexical Rich Text Editor Component
 * Provides a rich text editing experience with formatting capabilities
 */
export function LexicalEditor({
  value,
  editorState,
  onChange,
  placeholder = "Start typing...",
  autoFocus = false,
  className = "",
  showToolbar = false,
  noteId,
  onSourceUrlsChanged,
  onTagsChanged,
  onMentionsChanged,
  editorRef,
}: LexicalEditorProps) {
  // Store source URLs outside editor state to prevent loss on edits
  const sourceUrlsRef = useRef<string[]>([]);
  
  /**
   * Fetch mention suggestions dynamically as user types
   */
  const handleMentionSearch = useCallback(async (trigger: string, queryString: string | null) => {
    try {
      const response = await fetch("/api/nabu/mentions");
      if (!response.ok) {
        throw new Error("Failed to fetch mention data");
      }
      
      const result = await response.json();
      const data = result.data;
      
      // Filter based on trigger type
      if (trigger === "@") {
        // Combine notes, folders, and thoughts for @ mentions
        const allItems = [
          ...data.notes,
          ...data.folders,
          ...data.thoughts,
        ];
        
        // Filter by query if provided
        if (queryString) {
          const query = queryString.toLowerCase();
          return allItems.filter(item => 
            item.value.toLowerCase().startsWith(query)
          );
        }
        return allItems;
      } else if (trigger === "#") {
        // Tags for # mentions
        const tags = data.tags || [];
        
        if (queryString) {
          const query = queryString.toLowerCase();
          return tags.filter((item: any) => 
            item.value.toLowerCase().startsWith(query)
          );
        }
        return tags;
      } else if (trigger === "/") {
        // Folders only for /
        if (queryString) {
          const query = queryString.toLowerCase();
          return data.folders.filter((item: any) => 
            item.value.toLowerCase().startsWith(query)
          );
        }
        return data.folders;
      }
      
      return [];
    } catch (error) {
      console.error("Failed to fetch mention suggestions:", error);
      return [];
    }
  }, []);

  /**
   * Lexical editor configuration with all nodes and theme
   */
  const initialConfig = {
    namespace: "NabuEditor",
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
      AutoLinkNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      CodeNode,
      CodeHighlightNode,
      CustomImageNode,
      ...createBeautifulMentionNode(CustomMentionComponent),
    ],
    theme: {
      // Custom Tailwind theme for the editor
      paragraph: "mb-2 text-foreground",
      heading: {
        h1: "text-3xl font-bold font-serif mb-4 text-foreground",
        h2: "text-2xl font-bold font-serif mb-3 text-foreground",
        h3: "text-xl font-bold font-serif mb-2 text-foreground",
        h4: "text-lg font-semibold mb-2 text-foreground",
        h5: "text-base font-semibold mb-2 text-foreground",
      },
      quote: "border-l-4 border-primary pl-4 italic text-muted-foreground my-4",
      list: {
        nested: {
          listitem: "list-none",
        },
        ol: "list-decimal list-inside ml-4 my-2",
        ul: "list-disc list-inside ml-4 my-2",
        listitem: "ml-4",
        listitemChecked: "line-through opacity-60",
        listitemUnchecked: "list-item",
      },
      link: "inline-flex items-center gap-1 text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/20 transition-colors no-underline before:content-['🔗'] before:text-sm",
      text: {
        bold: "font-bold",
        italic: "italic",
        underline: "underline",
        strikethrough: "line-through",
        code: "bg-muted px-1.5 py-0.5 rounded text-sm font-mono",
      },
      code: "bg-muted p-4 rounded-lg font-mono text-sm block my-4 overflow-x-auto max-w-full whitespace-pre-wrap break-words",
      table: "border-collapse table-auto w-full my-4",
      tableCell: "border border-border p-2",
      tableCellHeader: "border border-border p-2 bg-muted font-semibold",
    },
    onError: (error: Error) => {
      console.error("Lexical error:", error);
    },
  };

  /**
   * Handle content changes - extract both plain text and serialized state
   * Also preserve source URLs in the serialized state
   */
  const handleChange = (editorState: EditorState, editor: LexicalEditor) => {
    editorState.read(() => {
      const root = $getRoot();
      const plainText = root.getTextContent();
      
      // Get the standard serialized state
      const stateJSON = editorState.toJSON();
      
      // Add source URLs from root node to the serialized state
      const sourceUrls = (root as any).__sourceUrls;
      if (sourceUrls && Array.isArray(sourceUrls) && sourceUrls.length > 0) {
        stateJSON.root = {
          ...stateJSON.root,
          __sourceUrls: sourceUrls,
        };
      }
      
      const serialized = JSON.stringify(stateJSON);
      onChange(plainText, serialized);
    });
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={`relative border border-input rounded-lg bg-muted/30 focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-colors ${className}`}>
        {showToolbar && <LexicalToolbar noteId={noteId} />}
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="w-full px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none resize-none min-h-[120px] overflow-y-visible bg-transparent"
                aria-placeholder={placeholder}
              />
            }
            placeholder={
              <div className={`absolute ${showToolbar ? 'top-2' : 'top-2'} left-3 text-sm text-muted-foreground pointer-events-none`}>
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        
        {/* Core Plugins */}
        <OnChangePlugin onChange={handleChange} />
        <HistoryPlugin />
        <DelayedAutoFocusPlugin shouldAutoFocus={autoFocus} />
        <ContentSyncPlugin plainText={value} serializedState={editorState} />
        <EditorRefPlugin editorRef={editorRef} />
        
        {/* List Plugins */}
        <ListPlugin />
        <CheckListPlugin />
        
        {/* Link Plugins */}
        <LinkPlugin />
        <AutoLinkPlugin matchers={MATCHERS} />
        <ClickableLinkPlugin />
        
        {/* Other Plugins */}
        <TabIndentationPlugin />

        <TablePlugin />
        
        {/* Markdown Plugin - enables Markdown paste and shortcuts */}
        <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
        
        {/* Source URL Capture Plugins */}
        <SourceUrlCapturePlugin sourceUrlsRef={sourceUrlsRef} />
        <SourceUrlDisplayPlugin sourceUrlsRef={sourceUrlsRef} onSourceUrlsChanged={onSourceUrlsChanged} />
        
        {/* Mentions Plugin */}
        <BeautifulMentionsPlugin
          triggers={["@", "#", "/"]}
          onSearch={handleMentionSearch}
          creatable
          insertOnBlur
          autoSpace
          allowSpaces
          menuComponent={CustomMenu}
          menuItemComponent={CustomMenuItem}
        />
        
        {/* Tag and Mention Tracking Plugins */}
        <TagSyncPlugin onTagsChanged={onTagsChanged} />
        <MentionSyncPlugin onMentionsChanged={onMentionsChanged} />
        
        {/* Image Plugin - drag/drop and paste support */}
        {noteId && <ImagePlugin noteId={noteId} />}
        
        {/* Custom Link Plugin for styling */}
        <CustomLinkPlugin />
      </div>
    </LexicalComposer>
  );
}

