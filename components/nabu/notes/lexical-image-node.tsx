import {
  DecoratorNode,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
  $getNodeByKey,
  $getSelection,
  $isNodeSelection,
  $createNodeSelection,
  $setSelection,
} from "lexical";
import React, { Suspense, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { toast } from "sonner";

// Inject hover styles for image delete button
if (typeof document !== "undefined") {
  const styleId = "lexical-image-hover-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .image-container:hover .image-delete-btn {
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Serialized image node
 */
export type SerializedImageNode = Spread<
  {
    src: string;
    altText: string;
    width?: number;
    height?: number;
    maxWidth?: number;
    imageId?: string; // ID in our database
  },
  SerializedLexicalNode
>;

/**
 * Image component props
 */
export interface ImageComponentProps {
  src: string;
  altText: string;
  width?: number;
  height?: number;
  maxWidth?: number;
  imageId?: string;
  nodeKey: NodeKey;
}

/**
 * Default image component with delete functionality
 */
function ImageComponent({
  src,
  altText,
  width,
  height,
  maxWidth = 800,
  imageId,
  nodeKey,
}: ImageComponentProps) {
  const [editor] = useLexicalComposerContext();
  const [isSelected, setIsSelected] = React.useState(false);
  
  // Check if it's an SVG (vector graphic)
  const isSvg = src.includes('.svg') || src.includes('image/svg');
  
  // Track selection state
  React.useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isNodeSelection(selection)) {
          setIsSelected(selection.has(nodeKey));
        } else {
          setIsSelected(false);
        }
      });
    });
  }, [editor, nodeKey]);
  
  const handleDelete = async () => {
    if (!imageId) return;
    
    if (!confirm("Delete this image?")) return;
    
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
        const node = $getNodeByKey(nodeKey);
        if (node) {
          node.remove();
        }
      });

      toast.success("Image deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete image");
    }
  };
  
  // Handle clicking on the image to select it
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from reaching editor and clearing selection
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (node) {
        // Create a node selection and set it
        const nodeSelection = $createNodeSelection();
        nodeSelection.add(nodeKey);
        $setSelection(nodeSelection);
      }
    });
  };
  
  return (
    <div
      className={`image-container relative my-4 cursor-pointer select-none transition-all ${
        isSelected ? "ring-2 ring-primary ring-offset-2 rounded-lg" : ""
      }`}
      style={{ maxWidth: maxWidth ? `${maxWidth}px` : undefined }}
      onClick={handleClick}
    >
      <img
        src={src}
        alt={altText}
        width={!isSvg && width ? width : undefined} // SVGs scale naturally, no fixed dimensions
        height={!isSvg && height ? height : undefined}
        className={`w-full h-auto rounded-lg border border-border ${isSvg ? 'bg-white dark:bg-slate-50 p-2' : ''}`}
        loading="lazy"
        draggable={false}
      />
      {imageId && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering parent div click
            handleDelete();
          }}
          className="image-delete-btn absolute top-2 right-2 bg-white border border-black rounded-full p-2 opacity-0 transition-opacity shadow-lg hover:bg-gray-50 z-10"
          aria-label="Delete image"
          title="Delete image"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="red"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * Loading component for suspense
 */
function ImageLoading() {
  return (
    <div className="my-4 flex items-center justify-center bg-muted rounded-lg border border-border h-48">
      <div className="text-muted-foreground">Loading image...</div>
    </div>
  );
}

/**
 * Custom ImageNode for Lexical editor
 */
export class CustomImageNode extends DecoratorNode<JSX.Element> {
  __src: string;
  __altText: string;
  __width?: number;
  __height?: number;
  __maxWidth?: number;
  __imageId?: string;

  static getType(): string {
    return "custom-image";
  }

  static clone(node: CustomImageNode): CustomImageNode {
    return new CustomImageNode(
      node.__src,
      node.__altText,
      node.__width,
      node.__height,
      node.__maxWidth,
      node.__imageId,
      node.__key
    );
  }

  constructor(
    src: string,
    altText: string,
    width?: number,
    height?: number,
    maxWidth?: number,
    imageId?: string,
    key?: NodeKey
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__width = width;
    this.__height = height;
    this.__maxWidth = maxWidth;
    this.__imageId = imageId;
  }

  static importJSON(serializedNode: SerializedImageNode): CustomImageNode {
    const { src, altText, width, height, maxWidth, imageId } = serializedNode;
    return $createImageNode({
      src,
      altText,
      width,
      height,
      maxWidth,
      imageId,
    });
  }

  exportJSON(): SerializedImageNode {
    return {
      src: this.__src,
      altText: this.__altText,
      width: this.__width,
      height: this.__height,
      maxWidth: this.__maxWidth,
      imageId: this.__imageId,
      type: "custom-image",
      version: 1,
    };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: (node: Node) => ({
        conversion: convertImageElement,
        priority: 0,
      }),
    };
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("img");
    element.setAttribute("src", this.__src);
    element.setAttribute("alt", this.__altText);
    if (this.__width) {
      element.setAttribute("width", String(this.__width));
    }
    if (this.__height) {
      element.setAttribute("height", String(this.__height));
    }
    return { element };
  }

  createDOM(): HTMLElement {
    const div = document.createElement("div");
    // Block-level container for the image decorator
    div.className = "image-node-wrapper";
    div.style.display = "block";
    div.style.userSelect = "none";
    div.style.width = "100%";
    div.style.pointerEvents = "auto";
    div.tabIndex = -1; // Make focusable but not in tab order
    return div;
  }

  updateDOM(): false {
    return false;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  getImageId(): string | undefined {
    return this.__imageId;
  }

  // Make images selectable as blocks (block-level element)
  isInline(): boolean {
    return false;
  }

  // Make images selectable and isolated (click to select)
  isIsolated(): boolean {
    return true;
  }

  // Enable keyboard selection (Delete/Backspace keys)
  isKeyboardSelectable(): boolean {
    return true;
  }

  // Allow this node to be selected
  canBeEmpty(): boolean {
    return false;
  }

  decorate(): JSX.Element {
    return (
      <Suspense fallback={<ImageLoading />}>
        <ImageComponent
          src={this.__src}
          altText={this.__altText}
          width={this.__width}
          height={this.__height}
          maxWidth={this.__maxWidth}
          imageId={this.__imageId}
          nodeKey={this.__key}
        />
      </Suspense>
    );
  }
}

/**
 * Convert DOM img element to ImageNode
 */
function convertImageElement(domNode: Node): null | DOMConversionOutput {
  if (domNode instanceof HTMLImageElement) {
    const { src, alt, width, height } = domNode;
    const node = $createImageNode({
      src,
      altText: alt,
      width: width || undefined,
      height: height || undefined,
    });
    return { node };
  }
  return null;
}

/**
 * Create image node helper
 */
export function $createImageNode({
  src,
  altText,
  width,
  height,
  maxWidth,
  imageId,
  key,
}: {
  src: string;
  altText: string;
  width?: number;
  height?: number;
  maxWidth?: number;
  imageId?: string;
  key?: NodeKey;
}): CustomImageNode {
  return new CustomImageNode(src, altText, width, height, maxWidth, imageId, key);
}

/**
 * Type guard for ImageNode
 */
export function $isImageNode(
  node: LexicalNode | null | undefined
): node is CustomImageNode {
  return node instanceof CustomImageNode;
}

