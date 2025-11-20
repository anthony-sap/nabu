"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Webhook, Plus, Copy, Trash2, Power, PowerOff, ExternalLink } from "lucide-react";
import { CreateWebhookModal } from "./create-webhook-modal";
import { formatDistanceToNow } from "date-fns";

/**
 * Webhook endpoint interface
 */
interface WebhookEndpoint {
  id: string;
  token: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalReceived: number;
  lastReceived: string | null;
}

/**
 * Webhooks Management Page
 * Shows list of user's webhook endpoints with stats
 */
export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  /**
   * Load webhooks list
   */
  const loadWebhooks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/nabu/webhooks");

      if (!response.ok) {
        throw new Error("Failed to load webhooks");
      }

      const data = await response.json();
      if (data.success) {
        setWebhooks(data.data);
      } else {
        throw new Error(data.error || "Failed to load webhooks");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load webhooks");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Delete a webhook endpoint
   */
  const handleDelete = async (webhookId: string) => {
    if (!confirm("Are you sure you want to delete this webhook endpoint? This action cannot be undone.")) {
      return;
    }

    try {
      setDeletingIds((prev) => new Set(prev).add(webhookId));

      const response = await fetch(`/api/nabu/webhooks/${webhookId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete webhook");
      }

      toast.success("Webhook endpoint deleted successfully");
      await loadWebhooks();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete webhook");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(webhookId);
        return next;
      });
    }
  };

  /**
   * Toggle webhook active status
   */
  const handleToggleActive = async (webhookId: string, currentStatus: boolean) => {
    try {
      setTogglingIds((prev) => new Set(prev).add(webhookId));

      const response = await fetch(`/api/nabu/webhooks/${webhookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update webhook");
      }

      toast.success(`Webhook ${!currentStatus ? "activated" : "deactivated"} successfully`);
      await loadWebhooks();
    } catch (error: any) {
      toast.error(error.message || "Failed to update webhook");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(webhookId);
        return next;
      });
    }
  };

  /**
   * Copy webhook URL to clipboard
   */
  const handleCopyUrl = async (token: string) => {
    const url = `${window.location.origin}/api/webhooks/inbound/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Webhook URL copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  // Load webhooks on mount
  useEffect(() => {
    loadWebhooks();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-6">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground mt-2">
            Configure webhook endpoints to receive data from external services
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Webhook
        </Button>
      </div>

      {/* Webhooks List */}
      {webhooks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No webhooks yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first webhook endpoint to start receiving data from external services
            </p>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {webhooks.map((webhook) => (
            <Card key={webhook.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>{webhook.name}</CardTitle>
                      {webhook.isActive ? (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <Power className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <PowerOff className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </div>
                    {webhook.description && (
                      <CardDescription>{webhook.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(webhook.id, webhook.isActive)}
                      disabled={togglingIds.has(webhook.id)}
                    >
                      {togglingIds.has(webhook.id) ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : webhook.isActive ? (
                        <PowerOff className="h-4 w-4" />
                      ) : (
                        <Power className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(webhook.id)}
                      disabled={deletingIds.has(webhook.id)}
                    >
                      {deletingIds.has(webhook.id) ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Webhook URL */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Webhook URL</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm break-all">
                        {typeof window !== "undefined" 
                          ? `${window.location.origin}/api/webhooks/inbound/${webhook.token}`
                          : `/api/webhooks/inbound/${webhook.token}`}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyUrl(webhook.token)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Received</p>
                      <p className="text-2xl font-bold">{webhook.totalReceived}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Received</p>
                      <p className="text-sm font-medium">
                        {webhook.lastReceived
                          ? formatDistanceToNow(new Date(webhook.lastReceived), { addSuffix: true })
                          : "Never"}
                      </p>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Created {formatDistanceToNow(new Date(webhook.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Webhook Modal */}
      <CreateWebhookModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={loadWebhooks}
      />
    </div>
  );
}


