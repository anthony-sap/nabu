/**
 * WhatsApp Settings Page
 * 
 * Allows users to view and manage their WhatsApp phone number links
 * and see the bot information for connecting their account.
 */

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { WhatsAppSettingsForm } from "@/components/whatsapp/settings-form";

export default async function WhatsAppSettingsPage() {
  const { getUser, isAuthenticated } = getKindeServerSession();
  
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    redirect("/api/auth/login");
  }

  const user = await getUser();
  
  // Get user's phone links
  const phoneLinks = await prisma.userPhoneLink.findMany({
    where: {
      userId: user!.id,
      deletedAt: null,
    },
    orderBy: {
      linkedAt: "desc",
    },
  });

  // Get tenant's WhatsApp integration
  const integration = await prisma.whatsAppIntegration.findFirst({
    where: {
      tenantId: user!.tenantId || null,
      deletedAt: null,
    },
  });

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-2">WhatsApp Integration</h1>
      <p className="text-gray-600 mb-8">
        Manage your WhatsApp connection to capture thoughts on the go.
      </p>

      <WhatsAppSettingsForm
        phoneLinks={phoneLinks}
        integration={integration}
        botNumber={integration?.phoneNumber}
      />
    </div>
  );
}

