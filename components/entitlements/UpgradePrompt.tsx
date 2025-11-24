/**
 * Upgrade Prompt Component
 * 
 * Reusable component for displaying feature-locked states with upgrade CTAs.
 */

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock, Sparkles, Zap } from "lucide-react";

interface UpgradePromptProps {
  /**
   * Feature name that requires upgrade
   */
  feature: string;
  
  /**
   * Current plan name
   */
  currentPlan?: string;
  
  /**
   * Required plan name
   */
  requiredPlan: "Personal" | "Teams";
  
  /**
   * Benefits of upgrading
   */
  benefits?: string[];
  
  /**
   * Custom message
   */
  message?: string;
  
  /**
   * Show as inline card or full card
   */
  variant?: "inline" | "full";
}

export function UpgradePrompt({
  feature,
  currentPlan = "Free",
  requiredPlan,
  benefits,
  message,
  variant = "full",
}: UpgradePromptProps) {
  const defaultBenefits = {
    Personal: [
      "WhatsApp integration",
      "Inbound webhooks",
      "AI chat inside Notes",
      "Manual AI actions with generous quota",
      "Linked AI docs",
      "Basic note-triggered automations",
    ],
    Teams: [
      "Everything in Personal, plus:",
      "Team workspaces with shared Folders/Tags",
      "Real-time collaborative editing",
      "Microsoft Teams integration",
      "Email & calendar ingestion",
      "Advanced AI workflows",
      "User management & analytics",
    ],
  };

  const displayBenefits = benefits || defaultBenefits[requiredPlan];
  const Icon = requiredPlan === "Teams" ? Sparkles : Zap;

  if (variant === "inline") {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center">
        <Lock className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <h3 className="font-semibold mb-1">{feature} requires {requiredPlan}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {message || `Upgrade to ${requiredPlan} to unlock this feature.`}
        </p>
        <Button asChild>
          <Link href="/pricing">Upgrade to {requiredPlan}</Link>
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <CardTitle>{feature} requires {requiredPlan}</CardTitle>
        </div>
        <CardDescription>
          {message || `You're currently on ${currentPlan}. Upgrade to ${requiredPlan} to unlock this feature and more.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm font-medium">With {requiredPlan}, you get:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {displayBenefits.map((benefit, index) => (
              <li key={index}>{benefit}</li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href="/pricing">Upgrade to {requiredPlan}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}


