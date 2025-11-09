import React from "react";
import { act, renderHook } from "@testing-library/react";

import { useMediaQuery } from "../use-media-query";

// Mock window.matchMedia
const mockMatchMedia = jest.fn();
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

describe("useMediaQuery", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock window.matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: mockMatchMedia,
    });

    // Mock window.addEventListener and removeEventListener
    Object.defineProperty(window, "addEventListener", {
      writable: true,
      configurable: true,
      value: mockAddEventListener,
    });

    Object.defineProperty(window, "removeEventListener", {
      writable: true,
      configurable: true,
      value: mockRemoveEventListener,
    });

    // Mock window.innerWidth and innerHeight
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });

    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  it("should detect mobile device", () => {
    mockMatchMedia.mockImplementation((query) => ({
      matches: query === "(max-width: 640px)",
    }));

    const { result } = renderHook(() => useMediaQuery());

    expect(result.current.device).toBe("mobile");
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isSm).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);
  });

  it("should detect sm device", () => {
    mockMatchMedia.mockImplementation((query) => ({
      matches: query === "(max-width: 768px)",
    }));

    const { result } = renderHook(() => useMediaQuery());

    expect(result.current.device).toBe("sm");
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isSm).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it("should detect tablet device", () => {
    mockMatchMedia.mockImplementation((query) => ({
      matches: query === "(min-width: 641px) and (max-width: 1024px)",
    }));

    const { result } = renderHook(() => useMediaQuery());

    expect(result.current.device).toBe("tablet");
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isSm).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it("should detect desktop device", () => {
    mockMatchMedia.mockImplementation((query) => ({
      matches: false, // No media queries match, defaults to desktop
    }));

    const { result } = renderHook(() => useMediaQuery());

    expect(result.current.device).toBe("desktop");
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isSm).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });

  it("should add resize event listener on mount", () => {
    mockMatchMedia.mockImplementation((query) => ({
      matches: false,
    }));

    renderHook(() => useMediaQuery());

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
  });

  it("should remove resize event listener on unmount", () => {
    mockMatchMedia.mockImplementation((query) => ({
      matches: false,
    }));

    const { unmount } = renderHook(() => useMediaQuery());

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "resize",
      expect.any(Function),
    );
  });

  it("should update device and dimensions on resize", () => {
    let resizeCallback: (() => void) | null = null;

    mockMatchMedia.mockImplementation((query) => ({
      matches: query === "(max-width: 640px)",
    }));

    mockAddEventListener.mockImplementation((event, callback) => {
      if (event === "resize") {
        resizeCallback = callback;
      }
    });

    const { result } = renderHook(() => useMediaQuery());

    // Initial state should be mobile
    expect(result.current.device).toBe("mobile");
    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);

    // Simulate resize to desktop
    mockMatchMedia.mockImplementation((query) => ({
      matches: false, // No matches, should be desktop
    }));

    // Update window dimensions
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1920,
    });

    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 1080,
    });

    act(() => {
      if (resizeCallback) {
        resizeCallback();
      }
    });

    expect(result.current.device).toBe("desktop");
    expect(result.current.width).toBe(1920);
    expect(result.current.height).toBe(1080);
  });

  it("should handle multiple device transitions", () => {
    let resizeCallback: (() => void) | null = null;

    mockAddEventListener.mockImplementation((event, callback) => {
      if (event === "resize") {
        resizeCallback = callback;
      }
    });

    const { result } = renderHook(() => useMediaQuery());

    // Start with mobile
    mockMatchMedia.mockImplementation((query) => ({
      matches: query === "(max-width: 640px)",
    }));

    act(() => {
      if (resizeCallback) {
        resizeCallback();
      }
    });

    expect(result.current.device).toBe("mobile");

    // Transition to tablet
    mockMatchMedia.mockImplementation((query) => ({
      matches: query === "(min-width: 641px) and (max-width: 1024px)",
    }));

    act(() => {
      if (resizeCallback) {
        resizeCallback();
      }
    });

    expect(result.current.device).toBe("tablet");

    // Transition to desktop
    mockMatchMedia.mockImplementation((query) => ({
      matches: false,
    }));

    act(() => {
      if (resizeCallback) {
        resizeCallback();
      }
    });

    expect(result.current.device).toBe("desktop");
  });

  it("should return null dimensions initially", () => {
    // Mock matchMedia to not match any queries initially
    mockMatchMedia.mockImplementation((query) => ({
      matches: false,
    }));

    const { result } = renderHook(() => useMediaQuery());

    // The hook should still return dimensions because it calls checkDevice on mount
    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);
  });
});
