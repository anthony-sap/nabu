import React from "react";

// Mock external dependencies
jest.mock("@kinde-oss/kinde-auth-nextjs/server", () => ({
  getKindeServerSession: jest.fn(),
}));

jest.mock("react", () => ({
  cache: jest.fn((fn) => fn),
}));

describe("Session utilities", () => {
  const mockGetKindeServerSession =
    require("@kinde-oss/kinde-auth-nextjs/server").getKindeServerSession;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("USER_PROPERTIES_MAP", () => {
    it("should export correct property mapping", async () => {
      const { USER_PROPERTIES_MAP } = await import("../session");

      expect(USER_PROPERTIES_MAP).toEqual({
        tenantId: "tenant_id",
        dbId: "db_id",
      });
    });
  });

  describe("getCurrentUser", () => {
    it("should return undefined when user is not authenticated", async () => {
      mockGetKindeServerSession.mockReturnValue({
        getUser: jest.fn(),
        getAccessToken: jest.fn(),
        isAuthenticated: jest.fn().mockResolvedValue(false),
      });

      const { getCurrentUser } = await import("../session");

      const result = await getCurrentUser();

      expect(result).toBeUndefined();
    });

    it("should return undefined when user has no email", async () => {
      mockGetKindeServerSession.mockReturnValue({
        getUser: jest.fn().mockResolvedValue({ id: "123" }),
        getAccessToken: jest.fn(),
        isAuthenticated: jest.fn().mockResolvedValue(true),
      });

      const { getCurrentUser } = await import("../session");

      const result = await getCurrentUser();

      expect(result).toBeUndefined();
    });

    it("should return undefined when user is null", async () => {
      mockGetKindeServerSession.mockReturnValue({
        getUser: jest.fn().mockResolvedValue(null),
        getAccessToken: jest.fn(),
        isAuthenticated: jest.fn().mockResolvedValue(true),
      });

      const { getCurrentUser } = await import("../session");

      const result = await getCurrentUser();

      expect(result).toBeUndefined();
    });

    it("should return undefined when access token is missing", async () => {
      mockGetKindeServerSession.mockReturnValue({
        getUser: jest.fn().mockResolvedValue({
          id: "123",
          email: "test@example.com",
          given_name: "John",
          family_name: "Doe",
        }),
        getAccessToken: jest.fn().mockResolvedValue(null),
        isAuthenticated: jest.fn().mockResolvedValue(true),
      });

      const { getCurrentUser } = await import("../session");

      const result = await getCurrentUser();

      expect(result).toBeUndefined();
    });

    it("should return user with mapped properties when authenticated", async () => {
      const mockUser = {
        id: "123",
        email: "test@example.com",
        given_name: "John",
        family_name: "Doe",
        properties: {
          tenant_id: "tenant_123",
          db_id: "db_456",
        },
      };

      const mockAccessToken = {
        access_token: "access_token_123",
        expires_in: 3600,
      };

      mockGetKindeServerSession.mockReturnValue({
        getUser: jest.fn().mockResolvedValue(mockUser),
        getAccessToken: jest.fn().mockResolvedValue(mockAccessToken),
        isAuthenticated: jest.fn().mockResolvedValue(true),
      });

      const { getCurrentUser } = await import("../session");

      const result = await getCurrentUser();

      expect(result).toEqual({
        id: "123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        given_name: "John",
        family_name: "Doe",
        tenantId: "tenant_123",
        dbId: "db_456",
        properties: {
          tenant_id: "tenant_123",
          db_id: "db_456",
        },
        access_token: "access_token_123",
        expires_in: 3600,
      });
    });

    it("should return user without properties when properties are missing", async () => {
      const mockUser = {
        id: "123",
        email: "test@example.com",
        given_name: "John",
        family_name: "Doe",
      };

      const mockAccessToken = {
        access_token: "access_token_123",
        expires_in: 3600,
      };

      mockGetKindeServerSession.mockReturnValue({
        getUser: jest.fn().mockResolvedValue(mockUser),
        getAccessToken: jest.fn().mockResolvedValue(mockAccessToken),
        isAuthenticated: jest.fn().mockResolvedValue(true),
      });

      const { getCurrentUser } = await import("../session");

      const result = await getCurrentUser();

      expect(result).toEqual({
        id: "123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        given_name: "John",
        family_name: "Doe",
        access_token: "access_token_123",
        expires_in: 3600,
      });
    });

    it("should handle partial properties mapping", async () => {
      const mockUser = {
        id: "123",
        email: "test@example.com",
        given_name: "John",
        family_name: "Doe",
        properties: {
          tenant_id: "tenant_123",
        },
      };

      const mockAccessToken = {
        access_token: "access_token_123",
        expires_in: 3600,
      };

      mockGetKindeServerSession.mockReturnValue({
        getUser: jest.fn().mockResolvedValue(mockUser),
        getAccessToken: jest.fn().mockResolvedValue(mockAccessToken),
        isAuthenticated: jest.fn().mockResolvedValue(true),
      });

      const { getCurrentUser } = await import("../session");

      const result = await getCurrentUser();

      expect(result).toEqual({
        id: "123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        given_name: "John",
        family_name: "Doe",
        tenantId: "tenant_123",
        dbId: undefined,
        properties: {
          tenant_id: "tenant_123",
        },
        access_token: "access_token_123",
        expires_in: 3600,
      });
    });
  });
});
