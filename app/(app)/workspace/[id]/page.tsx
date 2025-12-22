/**
 * Workspace Overview Page
 * 
 * View workspace details, usage statistics, and manage workspace settings.
 */

"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  Users,
  FileText,
  Folder,
  Zap,
  Settings,
  Loader2,
  BarChart3,
  Calendar,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface WorkspaceData {
  id: string;
  name: string;
  planCode: string;
  billingMode: string;
  createdAt: string;
  role: string;
  memberCount: number;
}

interface UsageData {
  realtime?: {
    activeSeats: number;
    notesCount: number;
    foldersCount: number;
    aiActions: number;
    automationRuns: number;
    month: string;
  };
}

export default function WorkspaceOverviewPage({ params }: PageProps) {
  const { id: workspaceId } = use(params);
  const router = useRouter();

  // Fetch workspace data
  const { data: workspace, isLoading: loadingWorkspace } = useQuery<WorkspaceData>({
    queryKey: ["workspace", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const workspace = data.data.find((w: WorkspaceData) => w.id === workspaceId);
      if (!workspace) throw new Error("Workspace not found");
      return workspace;
    },
  });

  // Fetch usage data
  const { data: usage, isLoading: loadingUsage } = useQuery<UsageData>({
    queryKey: ["workspace-usage", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/usage?includeRealtime=true`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data.data;
    },
    enabled: !!workspace,
  });

  // Fetch members preview
  const { data: members } = useQuery({
    queryKey: ["workspace-members-preview", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data.data.slice(0, 5); // First 5 members
    },
    enabled: !!workspace,
  });

  if (loadingWorkspace) {
    return (
      <div className="container max-w-6xl py-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-32 w-full mb-4" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="container max-w-6xl py-8">
        <Card>
          <CardHeader>
            <CardTitle>Workspace Not Found</CardTitle>
            <CardDescription>
              The workspace you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/settings">Back to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleVariant =
    workspace.role === "owner"
      ? "default"
      : workspace.role === "admin"
      ? "secondary"
      : "outline";

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard/settings">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-8 w-8" />
              {workspace.name}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={roleVariant}>{workspace.role}</Badge>
              <span className="text-sm text-muted-foreground">
                Created {new Date(workspace.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspace.memberCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingUsage ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                usage?.realtime?.notesCount ?? 0
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total notes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Folders</CardTitle>
            <Folder className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingUsage ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                usage?.realtime?.foldersCount ?? 0
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total folders</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Usage Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Usage Statistics
            </CardTitle>
            <CardDescription>
              Current month usage and activity metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsage ? (
              <div className="space-y-4">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : usage?.realtime ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">AI Actions</span>
                  </div>
                  <span className="text-sm font-bold">{usage.realtime.aiActions.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Automation Runs</span>
                  </div>
                  <span className="text-sm font-bold">
                    {usage.realtime.automationRuns.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Period</span>
                  </div>
                  <span className="text-sm font-bold">{usage.realtime.month}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No usage data available yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Members Preview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
                <CardDescription>
                  {workspace.memberCount} member{workspace.memberCount !== 1 ? "s" : ""} in this workspace
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/workspace/${workspaceId}/members`}>
                  View All
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {members ? (
              <div className="space-y-2">
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members found.</p>
                ) : (
                  members.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-2 rounded-lg border"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {member.firstName && member.lastName
                            ? `${member.firstName[0]}${member.lastName[0]}`.toUpperCase()
                            : member.email.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {member.firstName && member.lastName
                              ? `${member.firstName} ${member.lastName}`
                              : member.email}
                          </p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          member.role === "owner"
                            ? "default"
                            : member.role === "admin"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {member.role}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <Skeleton className="h-20" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/workspace/${workspaceId}/members`}>
                <Users className="h-4 w-4 mr-2" />
                Manage Members
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/notes">
                <FileText className="h-4 w-4 mr-2" />
                View Notes
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

