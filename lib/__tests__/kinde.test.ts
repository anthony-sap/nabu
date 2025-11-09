import { StatusEnum, UserRole } from "@prisma/client";

// Mock external dependencies
jest.mock("@/env", () => ({
  env: {
    KINDE_M2M_DOMAIN: "https://test.kinde.com",
    KINDE_M2M_AUTH_CLIENT_ID: "test_client_id",
    KINDE_M2M_AUTH_CLIENT_SECRET: "test_client_secret",
    KINDE_DEFAULT_ORG_CODE: "test_org_code",
  },
}));

jest.mock("@/lib/cache", () => ({
  cache: jest.fn((fn, keys, options) => {
    return jest.fn().mockResolvedValue("cached_access_token");
  }),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe("Kinde API functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe("getKindeAccessToken", () => {
    it("should return cached access token", async () => {
      const { getKindeAccessToken } = await import("../kinde");

      const result = await getKindeAccessToken();

      expect(result).toBe("cached_access_token");
    });
  });

  describe("callKindeTokenApi", () => {
    it("should call Kinde token API successfully", async () => {
      const mockResponse = {
        access_token: "test_access_token",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const { callKindeTokenApi } = await import("../kinde");

      const result = await callKindeTokenApi();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.kinde.com/oauth2/token",
        {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
          },
          body: expect.any(URLSearchParams),
        },
      );
      expect(result.data).toEqual(mockResponse);
    });

    it("should throw error when API call fails", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const { callKindeTokenApi } = await import("../kinde");

      await expect(callKindeTokenApi()).rejects.toThrow(
        "HTTP error! status: 400",
      );
    });
  });

  describe("createUserInKinde", () => {
    it("should create user in Kinde successfully", async () => {
      const mockUser = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        roles: [UserRole.USER],
      };
      const organizationCode = "test_org";

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: "user_123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({}),
        });

      const { createUserInKinde } = await import("../kinde");

      const result = await createUserInKinde(mockUser, organizationCode);

      expect(result).toBe("user_123");
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should throw error when user creation fails", async () => {
      const mockUser = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      };
      const organizationCode = "test_org";

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const { createUserInKinde } = await import("../kinde");

      await expect(
        createUserInKinde(mockUser, organizationCode),
      ).rejects.toThrow();
    });
  });

  describe("updateUserInKinde", () => {
    it("should update user in Kinde successfully", async () => {
      const mockUser = {
        id: "user_123",
        status: StatusEnum.ENABLE,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        emailVerified: null,
        image: null,
        roles: [UserRole.ADMIN],
        tenantId: "tenant_123",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        createdBy: "admin_user",
        updatedBy: "admin_user",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeCurrentPeriodStart: null,
        stripeCurrentPeriodEnd: null,
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: "user_123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({}),
        });

      const { updateUserInKinde } = await import("../kinde");

      const result = await updateUserInKinde(mockUser);

      expect(result).toEqual({ id: "user_123" });
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it("should update user with suspension and password reset flags", async () => {
      const mockUser = {
        id: "user_123",
        status: StatusEnum.ENABLE,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        emailVerified: null,
        image: null,
        roles: [UserRole.USER],
        tenantId: "tenant_123",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        createdBy: "admin_user",
        updatedBy: "admin_user",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        stripeCurrentPeriodStart: null,
        stripeCurrentPeriodEnd: null,
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ id: "user_123" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({}),
        });

      const { updateUserInKinde } = await import("../kinde");

      await updateUserInKinde(mockUser, true, true);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/user?id=user_123"),
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            given_name: "John",
            family_name: "Doe",
            is_suspended: true,
            is_password_reset_requested: true,
          }),
        }),
      );
    });
  });

  describe("updateUserPropertiesInKinde", () => {
    it("should update user properties successfully", async () => {
      const userSub = "user_123";
      const properties = {
        db_id: "123",
        tenant_id: "tenant_123",
        user_type: "coach",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const { updateUserPropertiesInKinde } = await import("../kinde");

      const result = await updateUserPropertiesInKinde(userSub, properties);

      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.kinde.com/api/v1/users/user_123/properties",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ properties }),
        }),
      );
    });
  });

  describe("updateUserRolesInKinde", () => {
    it("should update user roles successfully", async () => {
      const userSub = "user_123";
      const roles = ["ADMIN", "COACH"];
      const permissions = ["read:users", "write:users"];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true }),
      });

      const { updateUserRolesInKinde } = await import("../kinde");

      const result = await updateUserRolesInKinde(userSub, roles, permissions);

      expect(result).toEqual({ success: true });
      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.kinde.com/api/v1/organizations/test_org_code/users",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            users: [
              {
                id: userSub,
                operation: "update",
                roles,
                permissions,
              },
            ],
          }),
        }),
      );
    });
  });

  describe("getUserFromKinde", () => {
    it("should get user from Kinde successfully", async () => {
      const sub = "user_123";
      const mockUserData = {
        id: "user_123",
        given_name: "John",
        family_name: "Doe",
        email: "john@example.com",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUserData),
      });

      const { getUserFromKinde } = await import("../kinde");

      const result = await getUserFromKinde(sub);

      expect(result).toEqual(mockUserData);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.kinde.com/api/v1/user?id=user_123",
        expect.objectContaining({
          method: "GET",
        }),
      );
    });

    it("should throw error when user not found", async () => {
      const sub = "user_123";

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { getUserFromKinde } = await import("../kinde");

      await expect(getUserFromKinde(sub)).rejects.toThrow(
        "HTTP error! status: 404",
      );
    });
  });

  describe("findUsersInKinde", () => {
    it("should find users with query parameters", async () => {
      const props = {
        page_size: 10,
        email: "john@example.com",
        expand: "organizations",
      };
      const mockUsersData = {
        users: [
          { id: "user_1", email: "john@example.com" },
          { id: "user_2", email: "jane@example.com" },
        ],
        next_token: "next_page_token",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockUsersData),
      });

      const { findUsersInKinde } = await import("../kinde");

      const result = await findUsersInKinde(props);

      expect(result).toEqual(mockUsersData);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.kinde.com/api/v1/users?page_size=10email=john%40example.comexpand=organizations",
        expect.objectContaining({
          method: "GET",
        }),
      );
    });
  });

  describe("getRolesListFromKinde", () => {
    it("should get roles list successfully", async () => {
      const mockRolesData = {
        roles: [
          { id: "role_1", key: "ADMIN", name: "Administrator" },
          { id: "role_2", key: "COACH", name: "Coach" },
          { id: "role_3", key: "USER", name: "User" },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockRolesData),
      });

      const { getRolesListFromKinde } = await import("../kinde");

      const result = await getRolesListFromKinde();

      expect(result).toEqual(mockRolesData);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.kinde.com/api/v1/roles?page_size=500",
        expect.objectContaining({
          method: "GET",
        }),
      );
    });
  });

  describe("getRolePermissionsFromKinde", () => {
    it("should get role permissions successfully", async () => {
      const kindeRoleId = "role_123";
      const mockPermissionsData = {
        permissions: [
          { id: "perm_1", key: "read:users", name: "Read Users" },
          { id: "perm_2", key: "write:users", name: "Write Users" },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPermissionsData),
      });

      const { getRolePermissionsFromKinde } = await import("../kinde");

      const result = await getRolePermissionsFromKinde(kindeRoleId);

      expect(result).toEqual(mockPermissionsData);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://test.kinde.com/api/v1/roles/role_123/permissions?page_size=500",
        expect.objectContaining({
          method: "GET",
        }),
      );
    });
  });

  describe("getRolesAndPermissionsFromKinde", () => {
    it("should get roles and permissions successfully", async () => {
      const mockRolesData = {
        roles: [
          { id: "role_1", key: "ADMIN", name: "Administrator" },
          { id: "role_2", key: "COACH", name: "Coach" },
        ],
      };
      const mockPermissionsData1 = {
        permissions: [{ id: "perm_1", key: "read:users", name: "Read Users" }],
      };
      const mockPermissionsData2 = {
        permissions: [
          { id: "perm_2", key: "write:users", name: "Write Users" },
        ],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockRolesData),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockPermissionsData1),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockPermissionsData2),
        });

      const { getRolesAndPermissionsFromKinde } = await import("../kinde");

      const result = await getRolesAndPermissionsFromKinde();

      expect(result).toEqual({
        ADMIN: {
          id: "role_1",
          key: "ADMIN",
          name: "Administrator",
          permissions: mockPermissionsData1.permissions,
        },
        COACH: {
          id: "role_2",
          key: "COACH",
          name: "Coach",
          permissions: mockPermissionsData2.permissions,
        },
      });
    });

    it("should throw error when roles data is invalid", async () => {
      const mockInvalidRolesData = {
        roles: "invalid_data",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockInvalidRolesData),
      });

      const { getRolesAndPermissionsFromKinde } = await import("../kinde");

      await expect(getRolesAndPermissionsFromKinde()).rejects.toThrow(
        "Failed to get roles and permissions from Kinde",
      );
    });
  });
});
