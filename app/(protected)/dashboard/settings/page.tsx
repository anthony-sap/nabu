import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import Link from "next/link";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { DeleteAccountSection } from "@/components/dashboard/delete-account";
import { DashboardHeader } from "@/components/dashboard/header";
import { UserNameForm } from "@/components/forms/user-name-form";
import { UserRoleForm } from "@/components/forms/user-role-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Users, Building2, ArrowRight } from "lucide-react";

export const metadata = constructMetadata({
  title: "Settings – SaaS Starter",
  description: "Configure your account and website settings.",
});

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user?.id) redirect("/login");

  // Fetch user's workspace memberships
  const workspaceMemberships = await prisma.workspaceMembership.findMany({
    where: {
      userId: user.id,
      status: 'active',
    },
    include: {
      workspace: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: {
            select: {
              memberships: {
                where: { status: 'active' },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Fetch notes and folders counts for each workspace separately
  // (Workspace model doesn't have explicit relations to notes/folders)
  const workspaces = await Promise.all(
    workspaceMemberships.map(async (membership) => {
      const [notesCount, foldersCount] = await Promise.all([
        prisma.note.count({
          where: {
            workspaceId: membership.workspace.id,
            deletedAt: null,
          },
        }),
        prisma.folder.count({
          where: {
            workspaceId: membership.workspace.id,
            deletedAt: null,
          },
        }),
      ]);

      return {
        ...membership,
        workspace: {
          ...membership.workspace,
          _count: {
            ...membership.workspace._count,
            notes: notesCount,
            folders: foldersCount,
          },
        },
      };
    })
  );

  return (
    <>
      <DashboardHeader
        heading="Settings"
        text="Manage account and website settings."
      />
      <div className="divide-muted divide-y pb-10">
        <UserNameForm
          user={{
            id: user.id,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
          }}
        />
        <UserRoleForm
          user={{
            id: user.id,
            roles: user.roles?.map((role) => role.key) as UserRole[],
          }}
        />
        
        {/* Workspaces Section */}
        {workspaces.length > 0 && (
          <div className="py-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Workspaces
                </CardTitle>
                <CardDescription>
                  Manage your team workspaces, members, and usage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {workspaces.map((membership) => (
                  <div
                    key={membership.workspace.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{membership.workspace.name}</h3>
                        <Badge
                          variant={
                            membership.role === 'owner'
                              ? 'default'
                              : membership.role === 'admin'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {membership.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {membership.workspace._count.memberships} member
                          {membership.workspace._count.memberships !== 1 ? 's' : ''}
                        </span>
                        <span>
                          {membership.workspace._count.notes} note
                          {membership.workspace._count.notes !== 1 ? 's' : ''}
                        </span>
                        <span>
                          {membership.workspace._count.folders} folder
                          {membership.workspace._count.folders !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/workspace/${membership.workspace.id}/members`}>
                        <Button variant="outline" size="sm">
                          <Users className="h-4 w-4 mr-2" />
                          Members
                        </Button>
                      </Link>
                      <Link href={`/workspace/${membership.workspace.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* WhatsApp Integration Section */}
        <div className="py-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                WhatsApp Integration
              </CardTitle>
              <CardDescription>
                Connect your WhatsApp to capture thoughts on the go
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Link your WhatsApp phone number to automatically save messages as thoughts in your Nabu feed.
              </p>
              <Link href="/dashboard/settings/whatsapp">
                <Button>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Manage WhatsApp Integration
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <DeleteAccountSection />
      </div>
    </>
  );
}
