import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, Folder, Tag } from "lucide-react";
import { SavedThought } from "./types";
import { formatTimeAgo } from "./utils";

/**
 * Props for the ThoughtCard component
 */
interface ThoughtCardProps {
  thought: SavedThought;
}

/**
 * Card component for displaying a captured thought in the activity feed
 * Shows title, timestamp, content preview, folder, and tags
 */
export function ThoughtCard({ thought }: ThoughtCardProps) {
  return (
    <Card className="relative bg-background/60 border-border/40 hover:border-primary/30 transition-all duration-200 hover:shadow-xl hover:shadow-primary/5 backdrop-blur-md overflow-hidden group">
      {/* Glassy shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
      <CardContent className="relative pt-6 pb-5 px-6">
        <div className="space-y-4">
          {/* Header: Title and timestamp */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-serif font-semibold text-lg text-foreground mb-1.5 truncate">
                {thought.title || "Untitled Thought"}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatTimeAgo(thought.createdAt)}</span>
              </div>
            </div>
          </div>
          
          {/* Content preview with line clamping */}
          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
            {thought.content}
          </p>
          
          {/* Metadata: Folder and tags */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {thought.folder && (
              <Badge variant="secondary" className="text-xs gap-1.5 bg-secondary/15 text-secondary border-secondary/20 font-normal">
                <Folder className="h-3 w-3" />
                {thought.folder}
              </Badge>
            )}
            {thought.tags.length > 0 && (
              <>
                {thought.folder && <Separator orientation="vertical" className="h-3.5" />}
                <div className="flex flex-wrap gap-1.5">
                  {thought.tags.map((tag, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-[10px] border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 transition-colors px-2 py-0.5 font-normal"
                    >
                      <Tag className="h-2.5 w-2.5 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

