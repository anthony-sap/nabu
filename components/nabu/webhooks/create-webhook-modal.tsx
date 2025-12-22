"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Copy, Check } from "lucide-react";

interface CreateWebhookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/**
 * Create Webhook Modal Component
 * Allows users to create a new webhook endpoint
 */
export function CreateWebhookModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateWebhookModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdWebhook, setCreatedWebhook] = useState<{
    id: string;
    token: string;
    url: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      setIsCreating(true);

      const response = await fetch("/api/nabu/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create webhook");
      }

      if (data.success) {
        setCreatedWebhook({
          id: data.data.id,
          token: data.data.token,
          url: data.data.url,
        });
        toast.success("Webhook endpoint created successfully");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create webhook");
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Copy webhook URL to clipboard
   */
  const handleCopyUrl = async () => {
    if (!createdWebhook) return;

    try {
      await navigator.clipboard.writeText(createdWebhook.url);
      setCopied(true);
      toast.success("Webhook URL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!isCreating) {
      setName("");
      setDescription("");
      setCreatedWebhook(null);
      setCopied(false);
      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        {!createdWebhook ? (
          <>
            <DialogHeader>
              <DialogTitle>Create Webhook Endpoint</DialogTitle>
              <DialogDescription>
                Create a new webhook endpoint to receive data from external services.
                A unique URL will be generated for you.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Webhook"
                  disabled={isCreating}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Receive data from Zapier, Make.com, etc."
                  disabled={isCreating}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Webhook"
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Webhook Created Successfully</DialogTitle>
              <DialogDescription>
                Your webhook endpoint has been created. Copy the URL below and use it in your external service.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm break-all">
                    {createdWebhook.url}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyUrl}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Next steps:</strong>
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 list-disc list-inside space-y-1">
                  <li>Copy the webhook URL above</li>
                  <li>Paste it into your external service (Zapier, Make.com, etc.)</li>
                  <li>Send a test payload to verify it works</li>
                </ul>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleClose}>Done</Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}


