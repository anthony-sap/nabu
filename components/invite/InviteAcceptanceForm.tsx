/**
 * Invite Acceptance Form Component
 * 
 * Handles both authenticated and unauthenticated states.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LoginLink } from "@kinde-oss/kinde-auth-nextjs";
import { toast } from "sonner";
import {
  Users,
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface InviteAcceptanceFormProps {
  token: string;
  inviteEmail: string;
  workspaceName: string;
  workspaceId: string;
  role: string;
  isAuthenticated: boolean;
  userEmail: string | null;
}

// Role display names
const ROLE_DISPLAY: Record<string, { label: string; description: string }> = {
  admin: {
    label: "Admin",
    description: "Can manage members and workspace settings",
  },
  member: {
    label: "Member",
    description: "Can create and edit notes, collaborate with team",
  },
  guest: {
    label: "Guest",
    description: "Can view and comment on shared content",
  },
};

export function InviteAcceptanceForm({
  token,
  inviteEmail,
  workspaceName,
  workspaceId,
  role,
  isAuthenticated,
  userEmail,
}: InviteAcceptanceFormProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailMismatch =
    isAuthenticated &&
    userEmail &&
    userEmail.toLowerCase() !== inviteEmail.toLowerCase();

  const roleInfo = ROLE_DISPLAY[role] || {
    label: role,
    description: "Workspace member",
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);

    try {
      const response = await fetch(`/api/invites/${token}`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to accept invite");
        return;
      }

      toast.success(`You've joined ${workspaceName}!`);
      router.push("/notes");
    } catch (err) {
      setError("An error occurred while accepting the invite");
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-4 shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">You're Invited!</CardTitle>
        <CardDescription>
          Join <span className="font-semibold">{workspaceName}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Invite Details */}
        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Invited:</span>
            <span className="font-medium">{inviteEmail}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Role:</span>
            <Badge variant="secondary">{roleInfo.label}</Badge>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            {roleInfo.description}
          </p>
        </div>

        {/* Email Mismatch Warning */}
        {emailMismatch && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This invite was sent to <strong>{inviteEmail}</strong>, but you're
              logged in as <strong>{userEmail}</strong>. Please log in with the
              correct email to accept this invite.
            </AlertDescription>
          </Alert>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        {isAuthenticated ? (
          emailMismatch ? (
            <>
              <Button variant="outline" className="w-full" asChild>
                <LoginLink>Sign in with correct email</LoginLink>
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You'll need to sign out first
              </p>
            </>
          ) : (
            <Button
              onClick={handleAccept}
              disabled={isAccepting}
              className="w-full"
              size="lg"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Accept Invite
                </>
              )}
            </Button>
          )
        ) : (
          <>
            <LoginLink
              postLoginRedirectURL={`/invite/${token}`}
              className="w-full"
            >
              <Button className="w-full" size="lg">
                Sign in to Accept
              </Button>
            </LoginLink>
            <p className="text-xs text-center text-muted-foreground">
              Don't have an account? You'll create one when you sign in.
            </p>
          </>
        )}

        {/* Back to home link */}
        <Button variant="ghost" size="sm" asChild className="mt-2">
          <Link href="/">Back to Home</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}



