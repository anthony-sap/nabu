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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/shared/icons";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface WhatsAppSettingsFormProps {
  userPhoneNumber: string | null;
  phoneLinks: any[];
  integration: any;
  botNumber?: string;
}

export function WhatsAppSettingsForm({ userPhoneNumber, phoneLinks, integration, botNumber }: WhatsAppSettingsFormProps) {
  const [isUnlinking, setIsUnlinking] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSendVerificationCode = async () => {
    if (!phoneNumber.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/whatsapp/link/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send verification code");
      }

      setVerificationSent(true);
      toast.success("Verification code sent! Check your WhatsApp messages.");
    } catch (error) {
      console.error("Failed to send verification code:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send verification code");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch("/api/whatsapp/link/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phoneNumber,
          code: verificationCode 
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Invalid verification code");
      }

      toast.success("Phone number linked successfully!");
      
      // Reload page to show linked status
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Failed to verify code:", error);
      toast.error(error instanceof Error ? error.message : "Failed to verify code");
    } finally {
      setIsVerifying(false);
    }
  };

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
      toast.error("Failed to unlink phone number");
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
      {/* Connect WhatsApp Section - Only show if user has no phone number */}
      {!userPhoneNumber && (
        <Card className="p-6 border-primary/30 bg-primary/5">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Icons.smartphone className="h-5 w-5 text-primary" />
            Connect Your WhatsApp
          </h2>
          
          {!verificationSent ? (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Enter your WhatsApp phone number to receive a verification code and start capturing thoughts instantly.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="0400 000 000 or +61 400 000 000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={isSending}
                  />
                  <p className="text-xs text-gray-500">
                    Australian mobile numbers only
                  </p>
                </div>
                
                <Button
                  onClick={handleSendVerificationCode}
                  disabled={isSending || !phoneNumber.trim()}
                  className="w-full"
                >
                  {isSending ? (
                    <>
                      <Icons.spinner className="h-4 w-4 mr-2 animate-spin" />
                      Sending Code...
                    </>
                  ) : (
                    <>
                      <Icons.messageCircle className="h-4 w-4 mr-2" />
                      Send Verification Code
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 font-medium mb-2">
                  ✅ Verification code sent!
                </p>
                <p className="text-sm text-green-700">
                  Check your WhatsApp messages and enter the 6-digit code below.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setVerificationCode(value);
                  }}
                  maxLength={6}
                  disabled={isVerifying}
                  className="text-center text-2xl tracking-wider font-mono"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleVerifyCode}
                  disabled={isVerifying || verificationCode.length !== 6}
                  className="flex-1"
                >
                  {isVerifying ? (
                    <>
                      <Icons.spinner className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Link"
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    setVerificationSent(false);
                    setVerificationCode("");
                  }}
                  disabled={isVerifying}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* User Phone Status - Show if phone number exists */}
      {userPhoneNumber && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Your WhatsApp Number</h2>
          
          <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <Icons.smartphone className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">{userPhoneNumber}</p>
                <p className="text-xs text-green-700">
                  {phoneLinks.length > 0 ? "Verified and linked" : "Awaiting verification"}
                </p>
              </div>
            </div>
            {phoneLinks.length === 0 && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                Pending Verification
              </Badge>
            )}
          </div>

          {phoneLinks.length === 0 && (
            <div className="mt-4 space-y-4">
              {!verificationSent ? (
                <>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 mb-2">
                      <strong>Next step:</strong> Click below to receive a verification code via WhatsApp.
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => {
                      setPhoneNumber(userPhoneNumber);
                      handleSendVerificationCode();
                    }}
                    disabled={isSending}
                    className="w-full"
                  >
                    {isSending ? (
                      <>
                        <Icons.spinner className="h-4 w-4 mr-2 animate-spin" />
                        Sending Code...
                      </>
                    ) : (
                      <>
                        <Icons.messageCircle className="h-4 w-4 mr-2" />
                        Send Verification Code
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 font-medium mb-2">
                      ✅ Verification code sent!
                    </p>
                    <p className="text-sm text-green-700">
                      Check your WhatsApp messages and enter the 6-digit code below.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="verificationCodeExisting">Verification Code</Label>
                    <Input
                      id="verificationCodeExisting"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setVerificationCode(value);
                      }}
                      maxLength={6}
                      disabled={isVerifying}
                      className="text-center text-2xl tracking-wider font-mono"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleVerifyCode}
                      disabled={isVerifying || verificationCode.length !== 6}
                      className="flex-1"
                    >
                      {isVerifying ? (
                        <>
                          <Icons.spinner className="h-4 w-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify & Link"
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        setVerificationSent(false);
                        setVerificationCode("");
                      }}
                      disabled={isVerifying}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Bot Information */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Nabu WhatsApp Bot</h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800 mb-2">
            <strong>Bot Number:</strong> {botNumber || "Not configured"}
          </p>
          <p className="text-sm text-blue-800">
            Save this number as a contact to use the WhatsApp integration.
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <h3 className="font-semibold">How it works:</h3>
          <ol className="list-decimal list-inside space-y-1 text-gray-600">
            <li>Enter your WhatsApp phone number above</li>
            <li>Receive a 6-digit verification code via WhatsApp</li>
            <li>Enter the code on this page to complete linking</li>
            <li>Start capturing thoughts by sending any message to the bot!</li>
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

