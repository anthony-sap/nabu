"use client";

import { useEffect, useState } from "react";
import { NabuHeader } from "@/components/nabu/nabu-header";
import { NabuMobileNav } from "@/components/nabu/nabu-mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Search, Trash2, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { formatDistanceToNow } from "date-fns";

interface TrashItem {
  id: string;
  type: "note" | "thought";
  title?: string; // Only for notes
  content?: string; // For thoughts
  snippet: string;
  deletedAt: string;
  daysUntilPermanentDelete: number;
  permanentDeleteDate: string;
  folder?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  note?: { // For thoughts promoted from notes
    id: string;
    title: string;
  } | null;
  source?: string; // For thoughts
  _count: {
    attachments: number;
    images?: number;
    chunks: number;
    noteTags?: number;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function TrashPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  // Fetch trash items (notes and thoughts)
  const fetchTrash = async (search?: string, page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "25",
      });
      
      if (search && search.trim()) {
        params.append("search", search.trim());
      }

      const response = await fetch(`/api/nabu/trash?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setItems(data.data.items);
        setPagination(data.data.pagination);
      } else {
        throw new Error(data.error || "Failed to fetch trash");
      }
    } catch (error) {
      console.error("Error fetching trash:", error);
      toast({
        title: "Error",
        description: "Failed to load trash. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  // Handle search
  const handleSearch = () => {
    setSelectedItems(new Set());
    fetchTrash(searchQuery, 1);
  };

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(items.map((item) => `${item.type}:${item.id}`)));
    } else {
      setSelectedItems(new Set());
    }
  };

  // Handle select single
  const handleSelectItem = (item: TrashItem, checked: boolean) => {
    const itemKey = `${item.type}:${item.id}`;
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemKey);
    } else {
      newSelected.delete(itemKey);
    }
    setSelectedItems(newSelected);
  };

  // Handle restore
  const handleRestore = async () => {
    if (selectedItems.size === 0) return;

    try {
      setRestoring(true);
      
      // Convert selected items to API format
      const restoreItems = Array.from(selectedItems).map((key) => {
        const [type, id] = key.split(":");
        return { id, type: type as "note" | "thought" };
      });

      const response = await fetch("/api/nabu/trash/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: restoreItems }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Restored ${data.data.restored} item(s)`,
        });
        setSelectedItems(new Set());
        setShowRestoreDialog(false);
        // Refresh the list
        fetchTrash(searchQuery, pagination?.page || 1);
      } else {
        throw new Error(data.error || "Failed to restore items");
      }
    } catch (error) {
      console.error("Error restoring items:", error);
      toast({
        title: "Error",
        description: "Failed to restore items. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRestoring(false);
    }
  };

  // Format days remaining
  const formatDaysRemaining = (days: number) => {
    if (days === 0) return "< 1 day";
    if (days === 1) return "1 day";
    return `${days} days`;
  };

  // Get badge variant for days remaining
  const getDaysRemainingVariant = (days: number): "default" | "secondary" | "destructive" => {
    if (days <= 7) return "destructive";
    if (days <= 30) return "secondary";
    return "default";
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <NabuMobileNav />
      <NabuHeader />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trash2 className="h-8 w-8 text-muted-foreground" />
            <h1 className="text-3xl font-bold">Trash</h1>
          </div>
          <p className="text-muted-foreground">
            Deleted notes are kept for 60 days before permanent deletion
          </p>
        </div>

        {/* Toolbar */}
        <div className="bg-card border rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search */}
            <div className="flex gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search deleted notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} variant="secondary">
                Search
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={() => fetchTrash(searchQuery, pagination?.page || 1)}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button
                onClick={() => setShowRestoreDialog(true)}
                disabled={selectedItems.size === 0}
                variant="default"
                size="sm"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restore ({selectedItems.size})
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading trash...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 bg-card border rounded-lg">
            <Trash2 className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <h3 className="mt-4 text-lg font-semibold">Trash is empty</h3>
            <p className="mt-2 text-muted-foreground">
              {searchQuery ? "No deleted items match your search." : "You haven't deleted any notes or thoughts."}
            </p>
          </div>
        ) : (
          <div className="bg-card border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.size === items.length && items.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Title/Content</TableHead>
                  <TableHead className="hidden md:table-cell">Preview</TableHead>
                  <TableHead className="hidden lg:table-cell">Folder/Context</TableHead>
                  <TableHead>Deleted</TableHead>
                  <TableHead>Deletes in</TableHead>
                  <TableHead className="text-right">Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const itemKey = `${item.type}:${item.id}`;
                  const displayTitle = item.type === "note" ? (item.title || "Untitled") : "Quick thought";
                  const fileCount = (item._count.attachments || 0) + (item._count.images || 0);
                  
                  return (
                    <TableRow key={itemKey}>
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(itemKey)}
                          onCheckedChange={(checked) =>
                            handleSelectItem(item, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.type === "note" ? "default" : "secondary"}>
                          {item.type === "note" ? "Note" : "Thought"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium max-w-xs">
                        <div className="truncate">{displayTitle}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-md">
                        <div className="text-sm text-muted-foreground truncate">
                          {item.snippet || "No content"}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {item.folder && (
                          <Badge
                            variant="outline"
                            style={
                              item.folder.color
                                ? {
                                    borderColor: item.folder.color,
                                    color: item.folder.color,
                                  }
                                : undefined
                            }
                          >
                            {item.folder.name}
                          </Badge>
                        )}
                        {item.note && (
                          <Badge variant="outline">
                            From: {item.note.title}
                          </Badge>
                        )}
                        {item.source && item.type === "thought" && (
                          <Badge variant="outline" className="capitalize">
                            {item.source.toLowerCase()}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(item.deletedAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getDaysRemainingVariant(item.daysUntilPermanentDelete)}>
                          {formatDaysRemaining(item.daysUntilPermanentDelete)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {fileCount > 0 && <span>{fileCount}</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="border-t p-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => fetchTrash(searchQuery, pagination.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination.hasMore}
                    onClick={() => fetchTrash(searchQuery, pagination.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Items</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore {selectedItems.size} item(s)? They will be moved back
              to their original locations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={restoring}>
              {restoring ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

