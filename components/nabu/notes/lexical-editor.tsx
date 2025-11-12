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
import { HashtagNode } from "@lexical/hashtag";
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

import { $getRoot, $createParagraphNode, $createTextNode, EditorState, LexicalEditor } from "lexical";
import { useEffect, useRef, useState } from "react";
import { LexicalToolbar } from "./lexical-toolbar";
import { SourceUrlCapturePlugin } from "./lexical-source-capture-plugin";
import { SourceUrlDisplayPlugin, SourceInfo } from "./lexical-source-display-plugin";

/**
 * Custom mention component with tooltip
 */
const CustomMentionComponent = forwardRef<
  HTMLSpanElement,
  BeautifulMentionComponentProps
>(({ trigger, value, data, children, ...other }, ref) => {
  return (
    <span
      {...other}
      ref={ref}
      className="text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/20 transition-colors"
      title={data?.description || `${trigger}${value}`}
    >
      {children}
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
  onSourceUrlsChanged?: (sources: SourceInfo[]) => void;
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
  onSourceUrlsChanged,
}: LexicalEditorProps) {
  // Store source URLs outside editor state to prevent loss on edits
  const sourceUrlsRef = useRef<string[]>([]);
  
  /**
   * Mention items - folders, notes, thoughts for @, and tags for #
   */
  const [mentionItems, setMentionItems] = useState<{
    "@": Array<{ value: string; description?: string }>;
    "#": Array<{ value: string; description?: string }>;
    "/": Array<{ value: string; description?: string }>;
  }>({
    "@": [],
    "#": [],
    "/": [],
  });

  /**
   * Load mentions from localStorage on mount
   */
  useEffect(() => {
    try {
      // Load saved thoughts for @ mentions
      const savedThoughts = localStorage.getItem("nabu-saved-thoughts");
      const thoughts = savedThoughts ? JSON.parse(savedThoughts) : [];
      
      // Create mention items from thoughts
      const thoughtMentions = thoughts.map((thought: any) => ({
        value: thought.title || "Untitled",
        description: `Thought: ${thought.content.slice(0, 50)}...`,
      }));

      // Default folders
      const folderMentions = [
        { value: "Inbox", description: "Default inbox folder" },
        { value: "Work", description: "Work-related items" },
        { value: "Personal", description: "Personal notes" },
        { value: "Projects", description: "Project documentation" },
        { value: "Archive", description: "Archived items" },
      ];

      // Default tags
      const tagMentions = [
        { value: "urgent", description: "High priority" },
        { value: "work", description: "Work-related" },
        { value: "personal", description: "Personal items" },
        { value: "todo", description: "Action items" },
        { value: "idea", description: "Ideas and brainstorming" },
        { value: "meeting", description: "Meeting notes" },
        { value: "project", description: "Project-related" },
        { value: "research", description: "Research topics" },
        { value: "planning", description: "Planning and strategy" },
      ];

      setMentionItems({
        "@": [...folderMentions, ...thoughtMentions],
        "#": tagMentions,
        "/": folderMentions,
      });
    } catch (error) {
      console.error("Failed to load mentions:", error);
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
      HashtagNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      CodeNode,
      CodeHighlightNode,
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
      link: "text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/20 transition-colors no-underline",
      hashtag: "text-primary/80 font-medium",
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
        {showToolbar && <LexicalToolbar />}
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
        
        {/* List Plugins */}
        <ListPlugin />
        <CheckListPlugin />
        
        {/* Link Plugins */}
        <LinkPlugin />
        <AutoLinkPlugin matchers={MATCHERS} />
        <ClickableLinkPlugin />
        
        {/* Other Plugins */}
        <TabIndentationPlugin />
        <HashtagPlugin />
        <TablePlugin />
        
        {/* Markdown Plugin - enables Markdown paste and shortcuts */}
        <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
        
        {/* Source URL Capture Plugins */}
        <SourceUrlCapturePlugin sourceUrlsRef={sourceUrlsRef} />
        <SourceUrlDisplayPlugin sourceUrlsRef={sourceUrlsRef} onSourceUrlsChanged={onSourceUrlsChanged} />
        
        {/* Mentions Plugin */}
        <BeautifulMentionsPlugin
          items={mentionItems}
          triggers={["@", "#", "/"]}
          creatable={{
            "@": 'Add folder/note "{{name}}"',
            "#": 'Add tag "{{name}}"',
            "/": 'Add folder "{{name}}"',
          }}
          insertOnBlur
          autoSpace
          menuComponent={CustomMenu}
          menuItemComponent={CustomMenuItem}
        />
      </div>
    </LexicalComposer>
  );
}

