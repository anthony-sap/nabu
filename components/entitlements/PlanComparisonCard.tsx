/**
 * Plan Comparison Card Component
 * 
 * Displays plan features and limits with upgrade CTA.
 */

"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Sparkles, Zap, Star } from "lucide-react";
import { PLAN_CONFIGS } from "@/lib/entitlements/plans";
import { PlanCode } from "@/lib/entitlements/types";

interface PlanComparisonCardProps {
  planCode: PlanCode;
  isCurrentPlan: boolean;
  canUpgrade: boolean;
  onUpgrade: () => void;
  isLoading?: boolean;
}

// Feature display names
const FEATURE_LABELS: Record<string, string> = {
  whatsappCapture: "WhatsApp Capture",
  webhooks: "Inbound Webhooks",
  teamsIntegration: "Teams Integration",
  emailIngestion: "Email Ingestion",
  calendarIntegration: "Calendar Integration",
  aiNoteChat: "AI Note Chat",
  aiLinkedDocs: "AI Linked Docs",
  aiAutomations: "AI Automations",
  realtimeCollab: "Real-time Collaboration",
  teamSpaces: "Team Spaces",
  outboundWebhooks: "Outbound Webhooks",
  userManagement: "User Management",
  analytics: "Analytics",
};

// Plan icons
const PLAN_ICONS: Record<PlanCode, React.ElementType> = {
  free: Star,
  personal: Zap,
  teams: Sparkles,
};

export function PlanComparisonCard({
  planCode,
  isCurrentPlan,
  canUpgrade,
  onUpgrade,
  isLoading,
}: PlanComparisonCardProps) {
  const plan = PLAN_CONFIGS[planCode];
  const Icon = PLAN_ICONS[planCode];

  // Format limit value
  const formatLimit = (value: number | string): string => {
    if (value === "unmetered") return "Unlimited";
    if (typeof value === "number") return value.toLocaleString();
    return String(value);
  };

  return (
    <Card className={`relative ${isCurrentPlan ? "border-primary border-2" : ""}`}>
      {isCurrentPlan && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="default">
          Current Plan
        </Badge>
      )}
      
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription className="text-sm">
          {plan.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Limits */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Limits</h4>
          <ul className="space-y-1 text-sm">
            <li className="flex justify-between">
              <span>AI Actions/month</span>
              <span className="font-medium">{formatLimit(plan.limits.aiActionsPerMonth)}</span>
            </li>
            <li className="flex justify-between">
              <span>Automation Runs</span>
              <span className="font-medium">{formatLimit(plan.limits.automationRunsPerMonth)}</span>
            </li>
            <li className="flex justify-between">
              <span>Webhook Endpoints</span>
              <span className="font-medium">{formatLimit(plan.limits.webhookEndpoints)}</span>
            </li>
            <li className="flex justify-between">
              <span>Storage</span>
              <span className="font-medium">{formatLimit(plan.limits.storageGB)} GB</span>
            </li>
          </ul>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Features</h4>
          <ul className="space-y-1 text-sm">
            {Object.entries(plan.features).map(([key, value]) => {
              // Skip automation level as it's shown in limits
              if (key === "aiAutomations") return null;
              
              const label = FEATURE_LABELS[key] || key;
              const hasFeature = value === true || (typeof value === "string" && value !== "none");

              return (
                <li key={key} className="flex items-center gap-2">
                  {hasFeature ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={hasFeature ? "" : "text-muted-foreground"}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>

      <CardFooter>
        {isCurrentPlan ? (
          <Button disabled className="w-full" variant="outline">
            Current Plan
          </Button>
        ) : canUpgrade ? (
          <Button 
            onClick={onUpgrade} 
            disabled={isLoading} 
            className="w-full"
          >
            {isLoading ? "Upgrading..." : `Upgrade to ${plan.name}`}
          </Button>
        ) : (
          <Button disabled className="w-full" variant="outline">
            Not Available
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}



