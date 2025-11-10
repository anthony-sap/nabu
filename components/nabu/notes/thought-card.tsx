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
    <Card className="bg-card border-border hover:border-primary/40 transition-all duration-300 shadow-nabu-card hover:shadow-nabu-glow">
      <CardContent className="pt-6">
        <div className="space-y-3">
          {/* Header: Title and timestamp */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-serif font-bold text-lg text-foreground mb-1 truncate">
                {thought.title || "Untitled Thought"}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatTimeAgo(thought.createdAt)}</span>
              </div>
            </div>
          </div>
          
          {/* Content preview with line clamping */}
          <p className="text-foreground leading-relaxed line-clamp-3">
            {thought.content}
          </p>
          
          {/* Metadata: Folder and tags */}
          <div className="flex flex-wrap items-center gap-2">
            {thought.folder && (
              <Badge variant="secondary" className="text-xs gap-1.5 bg-secondary/20 text-secondary border-secondary/30">
                <Folder className="h-3 w-3" />
                {thought.folder}
              </Badge>
            )}
            {thought.tags.length > 0 && (
              <>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex flex-wrap gap-1.5">
                  {thought.tags.map((tag, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="text-[10px] border-primary/40 text-primary bg-primary/10 hover:bg-primary/15 transition-colors px-2 py-0.5"
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

