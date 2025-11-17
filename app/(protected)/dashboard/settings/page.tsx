import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import Link from "next/link";

import { getCurrentUser } from "@/lib/session";
import { constructMetadata } from "@/lib/utils";
import { DeleteAccountSection } from "@/components/dashboard/delete-account";
import { DashboardHeader } from "@/components/dashboard/header";
import { UserNameForm } from "@/components/forms/user-name-form";
import { UserRoleForm } from "@/components/forms/user-role-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";

export const metadata = constructMetadata({
  title: "Settings – SaaS Starter",
  description: "Configure your account and website settings.",
});

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user?.id) redirect("/login");

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
