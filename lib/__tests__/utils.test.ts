import React from "react";
import { render, screen } from "@testing-library/react";

import {
  absoluteUrl,
  capitalize,
  cn,
  constructMetadata,
  fetcher,
  formatDate,
  getBlurDataURL,
  nFormatter,
  placeholderBlurhash,
  timeAgo,
  truncate,
} from "../utils";

// Mock external dependencies
jest.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  },
}));

jest.mock("@/config/site", () => ({
  siteConfig: {
    name: "Test Site",
    description: "Test Description",
    ogImage: "https://example.com/og.jpg",
    url: "https://example.com",
  },
}));

// Mock fetch for fetcher function
global.fetch = jest.fn();

describe("Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should combine class names with cn function", () => {
    const result = cn("class1", "class2", "class3");
    expect(result).toBe("class1 class2 class3");
  });

  it("should construct metadata with default values", () => {
    const metadata = constructMetadata();
    expect(metadata.title).toBe("Test Site");
    expect(metadata.description).toBe("Test Description");
    expect(metadata.icons).toBe("/favicon.ico");
  });

  it("should construct metadata with custom values", () => {
    const metadata = constructMetadata({
      title: "Custom Title",
      description: "Custom Description",
      image: "https://example.com/custom.jpg",
      icons: "/custom.ico",
      noIndex: true,
    });
    expect(metadata.title).toBe("Custom Title");
    expect(metadata.description).toBe("Custom Description");
    expect(metadata.twitter?.images).toEqual([
      "https://example.com/custom.jpg",
    ]);
    expect(metadata.icons).toBe("/custom.ico");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("should format date correctly", () => {
    const date = new Date("2023-01-15");
    const result = formatDate(date.getTime());
    expect(result).toBe("January 15, 2023");
  });

  it("should format date from string", () => {
    const result = formatDate("2023-01-15");
    expect(result).toBe("January 15, 2023");
  });

  it("should create absolute URL", () => {
    const result = absoluteUrl("/api/test");
    expect(result).toBe("http://localhost:3000/api/test");
  });

  it("should format time ago correctly", () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const result = timeAgo(oneHourAgo);
    expect(result).toContain("ago");
  });

  it("should format time ago without ago suffix", () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const result = timeAgo(oneHourAgo, true);
    expect(result).not.toContain("ago");
  });

  it("should return never for null timestamp", () => {
    const result = timeAgo(null as any);
    expect(result).toBe("never");
  });

  it("should fetch data successfully", async () => {
    const mockResponse = { data: "test" };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetcher("https://api.example.com/test");
    expect(result).toEqual(mockResponse);
  });

  it("should handle fetch error with error message", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    });

    await expect(fetcher("https://api.example.com/test")).rejects.toThrow(
      "Not found",
    );
  });

  it("should handle fetch error without error message", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(fetcher("https://api.example.com/test")).rejects.toThrow(
      "An unexpected error occurred",
    );
  });

  it("should format numbers with nFormatter", () => {
    expect(nFormatter(0)).toBe("0");
    expect(nFormatter(1000)).toBe("1K");
    expect(nFormatter(1500)).toBe("1.5K");
    expect(nFormatter(1000000)).toBe("1M");
    expect(nFormatter(1234567)).toBe("1.2M");
  });

  it("should format numbers with custom digits", () => {
    expect(nFormatter(1500, 2)).toBe("1.5K");
    expect(nFormatter(1234567, 3)).toBe("1.235M");
  });

  it("should capitalize strings correctly", () => {
    expect(capitalize("hello")).toBe("Hello");
    expect(capitalize("WORLD")).toBe("WORLD");
    expect(capitalize("")).toBe("");
    expect(capitalize(null as any)).toBe(null);
    expect(capitalize(undefined as any)).toBe(undefined);
  });

  it("should truncate strings correctly", () => {
    expect(truncate("Hello world", 5)).toBe("Hello...");
    expect(truncate("Short", 10)).toBe("Short");
    expect(truncate("", 5)).toBe("");
    expect(truncate(null as any, 5)).toBe(null);
  });

  it("should return default blur data URL for null url", async () => {
    const result = await getBlurDataURL(null);
    expect(result).toBe(
      "data:image/webp;base64,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    );
  });

  it("should return default blur data URL for empty url", async () => {
    const result = await getBlurDataURL("");
    expect(result).toBe(
      "data:image/webp;base64,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    );
  });

  it("should handle fetch error in getBlurDataURL", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const result = await getBlurDataURL("https://example.com/image.jpg");
    expect(result).toBe(
      "data:image/webp;base64,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    );
  });

  it("should have placeholder blurhash constant", () => {
    expect(placeholderBlurhash).toBeDefined();
    expect(placeholderBlurhash).toContain("data:image/png;base64,");
  });
});
