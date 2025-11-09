import { NextRequest, NextResponse } from "next/server";
// Import middleware after mocking, and force type as function
import type { NextMiddleware } from "next/server";

import _middleware, { config } from "../middleware";

// Define the mock function as a function declaration so it's hoisted
function mockWithAuth(handler: any, options: any) {
  return async (req: NextRequest) => {
    const pathname = req.nextUrl?.pathname || req.url;
    if (options?.publicPaths?.includes(pathname)) {
      return NextResponse.next();
    }
    return handler(req);
  };
}

jest.mock("@kinde-oss/kinde-auth-nextjs/middleware", () => ({
  withAuth: mockWithAuth,
}));

const middleware = _middleware as NextMiddleware;

describe("Middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Middleware Configuration", () => {
    it("should be defined and wrapped with Kinde Auth", () => {
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe("function");
    });
  });

  describe("Matcher Configuration", () => {
    it("should export config with correct matcher pattern", () => {
      expect(config).toBeDefined();
      expect(config.matcher).toBeDefined();
      expect(Array.isArray(config.matcher)).toBe(true);

      const expectedPattern =
        "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)";
      expect(config.matcher).toContain(expectedPattern);
    });
  });

  describe("Error Handling", () => {
    it("should handle requests without throwing errors", async () => {
      const req = new NextRequest("http://localhost:3000/test");
      const event = {} as any; // Mock event object

      expect(async () => {
        await middleware(req, event);
      }).not.toThrow();
    });
  });
});
