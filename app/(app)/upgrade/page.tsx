"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Check, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { PLAN_CONFIGS } from "@/lib/entitlements/plans";
import { PlanCode } from "@/lib/entitlements/types";
import { useToast } from "@/components/ui/use-toast";
import { NabuNav } from "@/components/nabu/nabu-nav";
import { NabuMobileMenu } from "@/components/nabu/nabu-mobile-menu";
import { UserAccountNav } from "@/components/layout/user-account-nav";

interface UpgradeData {
  currentPlan: PlanCode;
  availableUpgrades: PlanCode[];
  workspaces: Array<{
    id: string;
    name: string;
    role: string;
  }>;
}

export default function UpgradePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeData, setUpgradeData] = useState<UpgradeData | null>(null);
  const [showTeamsDialog, setShowTeamsDialog] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");

  // Fetch current plan and available upgrades
  useEffect(() => {
    async function fetchUpgradeData() {
      try {
        const response = await fetch("/api/user/upgrade");
        if (!response.ok) {
          throw new Error("Failed to fetch upgrade data");
        }
        const data = await response.json();
        if (data.success) {
          setUpgradeData(data.data);
        } else {
          toast({
            title: "Error",
            description: data.message || "Failed to load upgrade options",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error fetching upgrade data:", error);
        toast({
          title: "Error",
          description: "Failed to load upgrade options",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchUpgradeData();
  }, [toast]);

  const handleUpgrade = async (targetPlan: PlanCode) => {
    if (targetPlan === "teams") {
      // Show dialog for workspace name
      setShowTeamsDialog(true);
      return;
    }

    // Handle Personal upgrade (direct)
    await performUpgrade(targetPlan);
  };

  const performUpgrade = async (targetPlan: PlanCode, workspaceName?: string) => {
    setUpgrading(true);
    try {
      const response = await fetch("/api/user/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetPlan,
          ...(workspaceName && { workspaceName }),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Upgrade failed");
      }

      toast({
        title: "Upgrade Successful!",
        description: data.message || `Successfully upgraded to ${targetPlan} plan`,
      });

      // Refresh the page to show updated plan
      setTimeout(() => {
        router.refresh();
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Upgrade error:", error);
      toast({
        title: "Upgrade Failed",
        description:
          error instanceof Error ? error.message : "An error occurred during upgrade",
        variant: "destructive",
      });
    } finally {
      setUpgrading(false);
      setShowTeamsDialog(false);
      setWorkspaceName("");
    }
  };

  const handleTeamsUpgrade = () => {
    if (!workspaceName.trim()) {
      toast({
        title: "Workspace Name Required",
        description: "Please enter a name for your workspace",
        variant: "destructive",
      });
      return;
    }
    performUpgrade("teams", workspaceName.trim());
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!upgradeData) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Unable to Load Upgrade Options</CardTitle>
            <CardDescription>
              Please refresh the page or contact support if the issue persists.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const currentPlanConfig = PLAN_CONFIGS[upgradeData.currentPlan];
  const availablePlans = upgradeData.availableUpgrades.map((code) => ({
    code,
    config: PLAN_CONFIGS[code],
  }));

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with Navigation */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Mobile Menu */}
            <div className="md:hidden">
              <NabuMobileMenu />
            </div>

            {/* Logo and Desktop Nav */}
            <div className="flex items-center gap-6 flex-1">
              <Link href="/notes" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-primary/10 relative flex items-center justify-center ring-1 ring-primary/20">
                  <img src="/nabu_logo.png" alt="Nabu" className="absolute inset-0 m-2 fill-[var(--nabu-mint)] w-5" />
                </div>
                <span className="font-serif font-bold text-lg hidden sm:inline">Nabu</span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:block">
                <NabuNav />
              </div>
            </div>

            {/* User Account Nav */}
            <div className="flex items-center gap-2">
              <UserAccountNav />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl flex-1">
        {/* Back Button */}
        <Link
          href="/notes"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Notes
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Upgrade Your Plan</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Unlock more features and capabilities with a plan upgrade
          </p>
        </div>

      {/* Current Plan */}
      <Card className="mb-8 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Current Plan</span>
            <span className="text-sm font-normal text-muted-foreground">
              ({currentPlanConfig.name})
            </span>
          </CardTitle>
          <CardDescription>{currentPlanConfig.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium mb-1">AI Actions</p>
              <p className="text-muted-foreground">
                {currentPlanConfig.limits.aiActionsPerMonth === "unmetered"
                  ? "Unlimited"
                  : `${currentPlanConfig.limits.aiActionsPerMonth}/month`}
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">Webhook Endpoints</p>
              <p className="text-muted-foreground">
                {currentPlanConfig.limits.webhookEndpoints === "unmetered"
                  ? "Unlimited"
                  : currentPlanConfig.limits.webhookEndpoints}
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">Storage</p>
              <p className="text-muted-foreground">
                {currentPlanConfig.limits.storageGB === "unmetered"
                  ? "Unlimited"
                  : `${currentPlanConfig.limits.storageGB} GB`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Upgrades */}
      {availablePlans.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>You're on the highest plan!</CardTitle>
            <CardDescription>
              You're already on the Teams plan with all features unlocked.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <h2 className="text-2xl font-semibold mb-6">Available Upgrades</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availablePlans.map(({ code, config }) => (
              <Card key={code} className="relative">
                <CardHeader>
                  <CardTitle className="text-2xl">{config.name}</CardTitle>
                  <CardDescription className="text-base">
                    {config.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Key Features */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Key Features:</h3>
                    <ul className="space-y-1.5 text-sm">
                      {config.features.whatsappCapture && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span>WhatsApp Capture</span>
                        </li>
                      )}
                      {config.features.webhooks && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span>Webhooks</span>
                        </li>
                      )}
                      {config.features.aiNoteChat && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span>AI Note Chat</span>
                        </li>
                      )}
                      {config.features.aiLinkedDocs && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span>AI Linked Documents</span>
                        </li>
                      )}
                      {config.features.teamSpaces && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span>Team Workspaces</span>
                        </li>
                      )}
                      {config.features.userManagement && (
                        <li className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span>User Management</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Limits */}
                  <div className="space-y-2 pt-2 border-t">
                    <h3 className="font-semibold text-sm">Limits:</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">AI Actions</p>
                        <p className="font-medium">
                          {config.limits.aiActionsPerMonth === "unmetered"
                            ? "Unlimited"
                            : `${config.limits.aiActionsPerMonth}/mo`}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Webhooks</p>
                        <p className="font-medium">
                          {config.limits.webhookEndpoints === "unmetered"
                            ? "Unlimited"
                            : config.limits.webhookEndpoints}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Storage</p>
                        <p className="font-medium">
                          {config.limits.storageGB === "unmetered"
                            ? "Unlimited"
                            : `${config.limits.storageGB} GB`}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Seats</p>
                        <p className="font-medium">
                          {config.limits.seats === "unmetered"
                            ? "Unlimited"
                            : config.limits.seats}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Upgrade Button */}
                  <Button
                    onClick={() => handleUpgrade(code)}
                    disabled={upgrading}
                    className="w-full mt-4"
                    size="lg"
                  >
                    {upgrading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Upgrading...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Upgrade to {config.name}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Teams Upgrade Dialog */}
      <Dialog open={showTeamsDialog} onOpenChange={setShowTeamsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Your Team Workspace</DialogTitle>
            <DialogDescription>
              To upgrade to Teams, you need to create a workspace. Enter a name
              for your workspace below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                placeholder="e.g., My Team, Acme Corp, Marketing Team"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && workspaceName.trim()) {
                    handleTeamsUpgrade();
                  }
                }}
                disabled={upgrading}
              />
              <p className="text-xs text-muted-foreground">
                This name will be used for your team workspace and can be changed
                later.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTeamsDialog(false);
                setWorkspaceName("");
              }}
              disabled={upgrading}
            >
              Cancel
            </Button>
            <Button onClick={handleTeamsUpgrade} disabled={upgrading || !workspaceName.trim()}>
              {upgrading ? (
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
    </div>
  );
}

