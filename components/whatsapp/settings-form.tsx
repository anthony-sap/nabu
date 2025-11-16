/**
 * WhatsApp Settings Form Component
 * 
 * Displays bot information and allows users to manage their
 * linked WhatsApp phone numbers.
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/shared/icons";
import { formatDistanceToNow } from "date-fns";

interface WhatsAppSettingsFormProps {
  phoneLinks: any[];
  integration: any;
  botNumber?: string;
}

export function WhatsAppSettingsForm({ phoneLinks, integration, botNumber }: WhatsAppSettingsFormProps) {
  const [isUnlinking, setIsUnlinking] = useState<string | null>(null);

  const handleUnlink = async (linkId: string) => {
    if (!confirm("Are you sure you want to unlink this phone number?")) {
      return;
    }

    setIsUnlinking(linkId);

    try {
      const response = await fetch(`/api/whatsapp/link/${linkId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to unlink");
      }

      window.location.reload();
    } catch (error) {
      alert("Failed to unlink phone number");
    } finally {
      setIsUnlinking(null);
    }
  };

  if (!integration) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Icons.alertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">WhatsApp Not Configured</h3>
          <p className="text-gray-600">
            WhatsApp integration is not yet set up for your account. Contact your administrator to enable this feature.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bot Information */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Nabu WhatsApp Bot</h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800 mb-2">
            <strong>Bot Number:</strong> {botNumber || "Not configured"}
          </p>
          <p className="text-sm text-blue-800">
            Save this number as a contact and send a message to start capturing thoughts via WhatsApp.
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <h3 className="font-semibold">How it works:</h3>
          <ol className="list-decimal list-inside space-y-1 text-gray-600">
            <li>Add the bot number to your WhatsApp contacts</li>
            <li>Send your first message</li>
            <li>Click the link to link your phone number</li>
            <li>Start capturing thoughts instantly!</li>
          </ol>
        </div>
      </Card>

      {/* Linked Numbers */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Linked Phone Numbers</h2>

        {phoneLinks.length === 0 ? (
          <div className="text-center py-8">
            <Icons.smartphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No phone numbers linked yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Message the bot to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {phoneLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Icons.smartphone className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{link.phoneNumber}</p>
                    <p className="text-xs text-gray-500">
                      Linked {formatDistanceToNow(new Date(link.linkedAt), { addSuffix: true })}
                      {link.lastMessageAt && (
                        <> • Last message {formatDistanceToNow(new Date(link.lastMessageAt), { addSuffix: true })}</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {link.isActive ? (
                    <Badge variant="default" className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnlink(link.id)}
                    disabled={isUnlinking === link.id}
                  >
                    {isUnlinking === link.id ? (
                      <Icons.spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <Icons.trash className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Privacy Notice */}
      <Card className="p-6 bg-gray-50">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Icons.lock className="h-4 w-4" />
          Privacy & Security
        </h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• All messages are encrypted in transit and at rest</li>
          <li>• Your WhatsApp messages are private to your account only</li>
          <li>• You can unlink your phone number at any time</li>
          <li>• Message history remains in your Nabu account after unlinking</li>
        </ul>
      </Card>
    </div>
  );
}

