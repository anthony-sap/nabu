import "whatwg-fetch";
import "@testing-library/jest-dom";

import { TextDecoder, TextEncoder } from "util";

// Add TextEncoder to global for server actions
global.TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

// Add setImmediate for Prisma
if (typeof setImmediate === "undefined") {
  (global as any).setImmediate = (fn: any, ...args: any[]) => setTimeout(fn, 0, ...args);
}

window.HTMLElement.prototype.hasPointerCapture = jest.fn();
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock ResizeObserver for cmdk library
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock the env module to avoid ES module import issues
jest.mock("@/env", () => ({
  env: {
    NEXTAUTH_URL: "http://localhost:3000",
    KINDE_CLIENT_ID: "test-client-id",
    KINDE_CLIENT_SECRET: "test-client-secret",
    KINDE_ISSUER_URL: "https://test.kinde.com",
    KINDE_SITE_URL: "http://localhost:3000",
    KINDE_POST_LOGOUT_REDIRECT_URL: "http://localhost:3000",
    KINDE_POST_LOGIN_REDIRECT_URL: "http://localhost:3000",
    KINDE_DEFAULT_ORG_CODE: "test-org",
    KINDE_M2M_DOMAIN: "http://test.kinde.com",
    KINDE_M2M_AUTH_CLIENT_ID: "test-m2m-client-id",
    KINDE_M2M_AUTH_CLIENT_SECRET: "test-m2m-client-secret",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    POSTMARK_API_KEY: "test-postmark-key",
    EMAIL_FROM: "test@example.com",
    OPENAI_API_KEY: "test-openai-key",
    OPENAI_DEFAULT_MODEL: "gpt-3.5-turbo",
    STRIPE_API_KEY: "test-stripe-key",
    STRIPE_WEBHOOK_SECRET: "test-webhook-secret",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PLAN_ID: "test-monthly-plan",
    NEXT_PUBLIC_STRIPE_PRO_YEARLY_PLAN_ID: "test-yearly-plan",
    NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PLAN_ID: "test-business-monthly",
    NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PLAN_ID: "test-business-yearly",
  },
}));

// Mock Next.js API routes
jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => {
      return {
        json: jest.fn().mockResolvedValue(data),
        status: init?.status || 200,
        headers: init?.headers || {},
      };
    }),
    redirect: jest.fn((url) => ({
      url,
      status: 302,
    })),
  },
}));

// Mock Next.js headers
jest.mock("next/headers", () => ({
  headers: jest.fn(() => new Map()),
  cookies: jest.fn(() => new Map()),
}));
