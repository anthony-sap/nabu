/**
 * WhatsApp Phone Number Link Verification Page
 * 
 * Verifies the one-time link token and allows the user to confirm
 * linking their WhatsApp number to their Nabu account.
 */

import { redirect } from "next/navigation";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { verifyLinkToken } from "@/lib/whatsapp-link";
import { WhatsAppLinkConfirm } from "@/components/whatsapp/link-confirm";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function WhatsAppLinkPage({ params }: PageProps) {
  const { token } = await params;
  const { getUser, isAuthenticated } = getKindeServerSession();

  // Verify token
  const verification = await verifyLinkToken(token);

  if (!verification.valid) {
    return (
      <div className="container max-w-md mx-auto mt-20 p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Link</h1>
        <p className="text-gray-600">
          This WhatsApp linking link is invalid or has expired. Please request a new link from the bot.
        </p>
      </div>
    );
  }

  // Check if authenticated
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    // Redirect to login with return URL
    redirect(`/api/auth/login?returnUrl=/nabu/whatsapp/link/${token}`);
  }

  const user = await getUser();

  return (
    <WhatsAppLinkConfirm
      token={token}
      phoneNumber={verification.phoneNumber!}
      userId={user!.id}
    />
  );
}

