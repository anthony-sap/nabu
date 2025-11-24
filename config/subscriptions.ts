import { PlansRow, SubscriptionPlan } from "types";
import { env } from "@/env";

/**
 * Pricing data aligned with entitlements tiers:
 * - Free: "Capture & Find" - Solo use, great capture + powerful search
 * - Personal: "Connected Brain" - Power user tier with integrations and AI
 * - Teams: "Shared Brain & Workflows" - For teams with collaboration
 */
export const pricingData: SubscriptionPlan[] = [
  {
    title: "Free",
    description: "Capture & Find - Solo use, great capture + powerful search",
    benefits: [
      "Web capture, Notes, Folders, Tags",
      "Hybrid search (full-text + embeddings)",
      "AI tag suggestions",
      "Rich text + images/screenshots",
      "Version history",
    ],
    limitations: [
      "No external integrations or automations",
      "Limited manual AI actions (trial pack)",
      "Limited note sharing recipients",
    ],
    prices: {
      monthly: 0,
      yearly: 0,
    },
    stripeIds: {
      monthly: null,
      yearly: null,
    },
  },
  {
    title: "Personal",
    description: "Connected Brain - Power user tier with integrations and AI",
    benefits: [
      "Everything in Free, plus:",
      "WhatsApp integration",
      "Inbound webhooks",
      "AI chat inside Notes",
      "Manual AI actions (summarize, expand, questions, tasks) with good quota",
      "Linked AI docs (agendas, briefs, follow-up drafts)",
      "Basic note-triggered automations",
    ],
    limitations: [
      "No team collaboration",
      "No Microsoft Teams integration",
      "No email/calendar ingestion",
    ],
    prices: {
      monthly: 15,
      yearly: 144,
    },
    stripeIds: {
      monthly: env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PLAN_ID,
      yearly: env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PLAN_ID,
    },
  },
  {
    title: "Teams",
    description: "Shared Brain & Workflows - For teams with collaboration",
    benefits: [
      "Everything in Personal, plus:",
      "Team workspaces with shared Folders/Tags",
      "Real-time collaborative editing",
      "Fine-grained folder/tag/note permissions",
      "Microsoft Teams integration",
      "Incoming email ingestion (workspace + per-user)",
      "Calendar integration (meeting notes + context)",
      "AI triggers & multi-step workflows",
      "User management, role-based access, workspace analytics",
    ],
    limitations: [],
    prices: {
      monthly: 30,
      yearly: 300,
    },
    stripeIds: {
      monthly: env.NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID,
      yearly: env.NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID,
    },
  },
];

export const plansColumns = [
  "free",
  "personal",
  "teams",
  "enterprise",
] as const;

export const comparePlans: PlansRow[] = [
  {
    feature: "Access to Analytics",
    starter: true,
    pro: true,
    business: true,
    enterprise: "Custom",
    tooltip: "All plans include basic analytics for tracking performance.",
  },
  {
    feature: "Custom Branding",
    starter: null,
    pro: "500/mo",
    business: "1,500/mo",
    enterprise: "Unlimited",
    tooltip: "Custom branding is available from the Pro plan onwards.",
  },
  {
    feature: "Priority Support",
    starter: null,
    pro: "Email",
    business: "Email & Chat",
    enterprise: "24/7 Support",
  },
  {
    feature: "Advanced Reporting",
    starter: null,
    pro: null,
    business: true,
    enterprise: "Custom",
    tooltip:
      "Advanced reporting is available in Business and Enterprise plans.",
  },
  {
    feature: "Dedicated Manager",
    starter: null,
    pro: null,
    business: null,
    enterprise: true,
    tooltip: "Enterprise plan includes a dedicated account manager.",
  },
  {
    feature: "API Access",
    starter: "Limited",
    pro: "Standard",
    business: "Enhanced",
    enterprise: "Full",
  },
  {
    feature: "Monthly Webinars",
    starter: false,
    pro: true,
    business: true,
    enterprise: "Custom",
    tooltip: "Pro and higher plans include access to monthly webinars.",
  },
  {
    feature: "Custom Integrations",
    starter: false,
    pro: false,
    business: "Available",
    enterprise: "Available",
    tooltip:
      "Custom integrations are available in Business and Enterprise plans.",
  },
  {
    feature: "Roles and Permissions",
    starter: null,
    pro: "Basic",
    business: "Advanced",
    enterprise: "Advanced",
    tooltip:
      "User roles and permissions management improves with higher plans.",
  },
  {
    feature: "Onboarding Assistance",
    starter: false,
    pro: "Self-service",
    business: "Assisted",
    enterprise: "Full Service",
    tooltip: "Higher plans include more comprehensive onboarding assistance.",
  },
  // Add more rows as needed
];
