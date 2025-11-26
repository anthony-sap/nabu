/**
 * Plan Upgrade Page
 * 
 * Displays plan comparison and allows users to upgrade their plan.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlanComparisonCard } from "@/components/entitlements/PlanComparisonCard";
import { useUpgradeOptions, usePlanUpgrade } from "@/hooks/use-plan-upgrade";
import { PlanCode } from "@/lib/entitlements/types";

export default function UpgradePage() {
  const router = useRouter();
  const { data: options, isLoading: isLoadingOptions, error } = useUpgradeOptions();
  const { mutate: upgrade, isPending: isUpgrading } = usePlanUpgrade();
  
  const [showTeamsDialog, setShowTeamsDialog] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [upgradeTarget, setUpgradeTarget] = useState<"personal" | "teams" | null>(null);

  const handleUpgrade = (targetPlan: "personal" | "teams") => {
    if (targetPlan === "teams") {
      setUpgradeTarget("teams");
      setShowTeamsDialog(true);
      return;
    }

    // Direct upgrade for Personal
    upgrade(
      { targetPlan },
      {
        onSuccess: (result) => {
          toast.success(
            `Successfully upgraded to ${result.newPlan.charAt(0).toUpperCase() + result.newPlan.slice(1)} plan!`
          );
          router.push("/notes");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to upgrade plan");
        },
      }
    );
  };

  const handleTeamsUpgrade = () => {
    if (!workspaceName.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }

    upgrade(
      { targetPlan: "teams", workspaceName: workspaceName.trim() },
      {
        onSuccess: (result) => {
          toast.success(
            `Successfully upgraded to Teams plan! Your workspace "${result.workspace?.name}" is ready.`
          );
          setShowTeamsDialog(false);
          router.push("/notes");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to upgrade plan");
        },
      }
    );
  };

  if (isLoadingOptions) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !options) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Failed to load upgrade options</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const planOrder: PlanCode[] = ["free", "personal", "teams"];

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/notes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Notes
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Upgrade Your Plan</h1>
        <p className="mt-2 text-muted-foreground">
          Choose the plan that best fits your needs. Unlock more features and capabilities.
        </p>
      </div>

      {/* Plan Comparison Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {planOrder.map((planCode) => {
          const isCurrentPlan = options.currentPlan === planCode;
          const canUpgrade = options.availableUpgrades.includes(planCode);

          return (
            <PlanComparisonCard
              key={planCode}
              planCode={planCode}
              isCurrentPlan={isCurrentPlan}
              canUpgrade={canUpgrade}
              onUpgrade={() => handleUpgrade(planCode as "personal" | "teams")}
              isLoading={isUpgrading && upgradeTarget === planCode}
            />
          );
        })}
      </div>

      {/* Current Workspaces */}
      {options.workspaces.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Your Workspaces</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {options.workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="rounded-lg border p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{workspace.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{workspace.role}</p>
                </div>
                <Check className="h-5 w-5 text-green-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Note about testing */}
      <div className="mt-8 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        <p>
          <strong>Testing Mode:</strong> Plan upgrades are currently free for testing purposes.
          Payment integration will be added in a future update.
        </p>
      </div>

      {/* Teams Upgrade Dialog */}
      <Dialog open={showTeamsDialog} onOpenChange={setShowTeamsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Your Team Workspace</DialogTitle>
            <DialogDescription>
              Upgrading to Teams will create a new workspace where you can invite team members
              and collaborate on notes together.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                placeholder="e.g., My Company, Project Alpha"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                disabled={isUpgrading}
              />
              <p className="text-xs text-muted-foreground">
                You can change this later in workspace settings.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTeamsDialog(false)}
              disabled={isUpgrading}
            >
              Cancel
            </Button>
            <Button onClick={handleTeamsUpgrade} disabled={isUpgrading}>
              {isUpgrading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Workspace & Upgrade"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



