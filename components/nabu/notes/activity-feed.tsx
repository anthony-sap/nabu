import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles } from "lucide-react";
import { QuickCaptureForm } from "./quick-capture-form";
import { ThoughtCard } from "./thought-card";
import { SavedThought } from "./types";

/**
 * Props for the ActivityFeed component
 */
interface ActivityFeedProps {
  thoughts: SavedThought[];
  onSaveThought: (title: string, content: string) => void;
}

/**
 * Component displaying the activity feed of captured thoughts
 * Includes quick capture form and list of thoughts in reverse chronological order
 */
export function ActivityFeed({ thoughts, onSaveThought }: ActivityFeedProps) {
  return (
    <div className="h-full">
      <ScrollArea className="h-full">
        <div className="space-y-4 pt-6 pb-6">
          {/* Quick capture form */}
          <QuickCaptureForm onSave={onSaveThought} />
          
          {/* Empty state when no thoughts exist */}
          {thoughts.length === 0 ? (
            <Card className="bg-card/30 border-border/20">
              <CardContent className="py-16 text-center space-y-4">
                <div className="relative mx-auto w-16 h-16">
                  <div className="absolute inset-0 bg-primary/10 rounded-full blur-lg" />
                  <div className="relative flex items-center justify-center w-full h-full bg-primary/5 rounded-full border border-primary/20">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-base text-foreground">No thoughts yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    Start capturing your thoughts using the quick capture tool. They'll appear here in your activity feed.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* List of thought cards */
            thoughts.map((thought) => (
              <ThoughtCard key={thought.id} thought={thought} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

