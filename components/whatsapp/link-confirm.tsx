/**
 * WhatsApp Link Confirmation Component
 * 
 * Displays the phone number to be linked and allows the user
 * to confirm or cancel the linking process.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icons } from "@/components/shared/icons";

interface WhatsAppLinkConfirmProps {
  token: string;
  phoneNumber: string;
  userId: string;
}

export function WhatsAppLinkConfirm({ token, phoneNumber, userId }: WhatsAppLinkConfirmProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/whatsapp/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to link phone number");
      }

      // Success - redirect to thoughts page
      router.push("/nabu/thoughts?linked=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-md mx-auto mt-20 p-6">
      <Card className="p-6">
        <div className="flex items-center justify-center mb-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icons.smartphone className="h-6 w-6 text-primary" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-2">Link WhatsApp Number</h1>
        
        <p className="text-center text-gray-600 mb-6">
          Confirm linking <strong>{phoneNumber}</strong> to your Nabu account.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            After linking, all messages sent from this WhatsApp number to the Nabu bot will automatically create Thoughts in your feed.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Link
          </Button>
          
          <Button
            variant="outline"
            onClick={() => router.push("/nabu")}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}

