import { StatusEnum } from "@prisma/client";

import { updateUserName } from "../update-user-name";

// Mock external dependencies
jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/kinde", () => ({
  updateUserInKinde: jest.fn(),
}));

jest.mock("@/lib/session", () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const mockPrisma = require("@/lib/db").prisma;
const mockUpdateUserInKinde = require("@/lib/kinde").updateUserInKinde;
const mockGetCurrentUser = require("@/lib/session").getCurrentUser;
const mockRevalidatePath = require("next/cache").revalidatePath;

describe("updateUserName", () => {
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    firstName: "John",
    lastName: "Doe",
    status: StatusEnum.ENABLE,
  };

  const validFormData = {
    firstName: "Jane",
    lastName: "Smith",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should successfully update user name", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue({
      ...mockUser,
      ...validFormData,
    });
    mockUpdateUserInKinde.mockResolvedValue(undefined);

    const result = await updateUserName("user-123", validFormData);

    expect(result).toEqual({ status: "success" });
    expect(mockGetCurrentUser).toHaveBeenCalled();
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: validFormData,
    });
    expect(mockUpdateUserInKinde).toHaveBeenCalledWith(
      { ...mockUser, ...validFormData },
      false,
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/settings");
  });

  it("should handle disabled user status correctly", async () => {
    const disabledUser = { ...mockUser, status: StatusEnum.DISABLE };
    mockGetCurrentUser.mockResolvedValue(disabledUser);
    mockPrisma.user.update.mockResolvedValue({
      ...disabledUser,
      ...validFormData,
    });
    mockUpdateUserInKinde.mockResolvedValue(undefined);

    const result = await updateUserName("user-123", validFormData);

    expect(result).toEqual({ status: "success" });
    expect(mockUpdateUserInKinde).toHaveBeenCalledWith(
      { ...disabledUser, ...validFormData },
      true,
    );
  });

  it("should return error when user is not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await updateUserName("user-123", validFormData);

    expect(result).toEqual({ status: "error" });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockUpdateUserInKinde).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("should return error when validation fails", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);

    const invalidFormData = {
      firstName: "Jo", // Too short (min 3 characters)
      lastName: "Smith",
    };

    const result = await updateUserName("user-123", invalidFormData);

    expect(result).toEqual({ status: "error" });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockUpdateUserInKinde).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("should return error when prisma update fails", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockRejectedValue(new Error("Database error"));

    const result = await updateUserName("user-123", validFormData);

    expect(result).toEqual({ status: "error" });
    expect(mockUpdateUserInKinde).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("should return error when kinde update fails", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue({
      ...mockUser,
      ...validFormData,
    });
    mockUpdateUserInKinde.mockRejectedValue(new Error("Kinde error"));

    const result = await updateUserName("user-123", validFormData);

    expect(result).toEqual({ status: "error" });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("should handle empty string validation", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);

    const emptyFormData = {
      firstName: "",
      lastName: "",
    };

    const result = await updateUserName("user-123", emptyFormData);

    expect(result).toEqual({ status: "error" });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("should handle very long names validation", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);

    const longFormData = {
      firstName: "A".repeat(33), // Too long (max 32 characters)
      lastName: "Smith",
    };

    const result = await updateUserName("user-123", longFormData);

    expect(result).toEqual({ status: "error" });
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("should handle edge case names exactly at limits", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockPrisma.user.update.mockResolvedValue({
      ...mockUser,
      firstName: "A".repeat(32),
      lastName: "B".repeat(32),
    });
    mockUpdateUserInKinde.mockResolvedValue(undefined);

    const edgeFormData = {
      firstName: "A".repeat(32), // Exactly at max limit
      lastName: "B".repeat(32), // Exactly at max limit
    };

    const result = await updateUserName("user-123", edgeFormData);

    expect(result).toEqual({ status: "success" });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: edgeFormData,
    });
  });
});
