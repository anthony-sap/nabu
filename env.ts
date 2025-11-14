import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // This is optional because it's only used in development.
    // See https://next-auth.js.org/deployment.
    NEXTAUTH_URL: z.string().url().optional(),
    // Kinde
    KINDE_CLIENT_ID: z.string().min(1),
    KINDE_CLIENT_SECRET: z.string().min(1),
    KINDE_ISSUER_URL: z.string().min(1),
    KINDE_SITE_URL: z.string().min(1),
    KINDE_POST_LOGOUT_REDIRECT_URL: z.string().min(1),
    KINDE_POST_LOGIN_REDIRECT_URL: z.string().min(1),
    KINDE_DEFAULT_ORG_CODE: z.string().min(1),
    KINDE_M2M_DOMAIN: z.string().min(1),
    KINDE_M2M_AUTH_CLIENT_ID: z.string().min(1),
    KINDE_M2M_AUTH_CLIENT_SECRET: z.string().min(1),
    // Database
    DATABASE_URL: z.string().min(1),
    // Email
    POSTMARK_API_KEY: z.string(),
    EMAIL_FROM: z.string(),
    // Stripe
    STRIPE_API_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    // Supabase (server-side only)
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    // OpenAI for embeddings
    OPENAI_API_KEY: z.string().min(1),
    // Embeddings configuration (optional - have sensible defaults)
    EMBEDDING_MODEL: z.string().optional(),
    EMBEDDING_DIMENSIONS: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().min(1),
    // Stripe
    NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PLAN_ID: z.string(),
    NEXT_PUBLIC_STRIPE_PRO_YEARLY_PLAN_ID: z.string(),
    NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID: z.string(),
    NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID: z.string(),
  },
  runtimeEnv: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    // Kinde
    KINDE_CLIENT_ID: process.env.KINDE_CLIENT_ID,
    KINDE_CLIENT_SECRET: process.env.KINDE_CLIENT_SECRET,
    KINDE_ISSUER_URL: process.env.KINDE_ISSUER_URL,
    KINDE_SITE_URL: process.env.KINDE_SITE_URL,
    KINDE_POST_LOGOUT_REDIRECT_URL: process.env.KINDE_POST_LOGOUT_REDIRECT_URL,
    KINDE_POST_LOGIN_REDIRECT_URL: process.env.KINDE_POST_LOGIN_REDIRECT_URL,
    KINDE_DEFAULT_ORG_CODE: process.env.KINDE_DEFAULT_ORG_CODE,
    KINDE_M2M_DOMAIN: process.env.KINDE_M2M_DOMAIN,
    KINDE_M2M_AUTH_CLIENT_ID: process.env.KINDE_M2M_AUTH_CLIENT_ID,
    KINDE_M2M_AUTH_CLIENT_SECRET: process.env.KINDE_M2M_AUTH_CLIENT_SECRET,
    // Database
    DATABASE_URL: process.env.DATABASE_URL,
    // Email
    POSTMARK_API_KEY: process.env.POSTMARK_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    // App
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    // Stripe
    STRIPE_API_KEY: process.env.STRIPE_API_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PLAN_ID:
      process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PLAN_ID,
    NEXT_PUBLIC_STRIPE_PRO_YEARLY_PLAN_ID:
      process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PLAN_ID,
    NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID:
      process.env.NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID,
    NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID:
      process.env.NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID,
    // Supabase (server-side only)
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    // OpenAI
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
    EMBEDDING_DIMENSIONS: process.env.EMBEDDING_DIMENSIONS,
  },
});
