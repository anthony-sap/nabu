import React from "react";
import { act, renderHook } from "@testing-library/react";

import { useScroll } from "../use-scroll";

// Mock window properties and methods
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

describe("useScroll", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock window.pageYOffset
    Object.defineProperty(window, "pageYOffset", {
      writable: true,
      configurable: true,
      value: 0,
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
  });

  it("should return false when scroll position is below threshold", () => {
    Object.defineProperty(window, "pageYOffset", {
      writable: true,
      configurable: true,
      value: 50,
    });

    const { result } = renderHook(() => useScroll(100));

    expect(result.current).toBe(false);
  });

  it("should return true when scroll position is above threshold", () => {
    let scrollCallback: (() => void) | null = null;

    mockAddEventListener.mockImplementation((event, callback) => {
      if (event === "scroll") {
        scrollCallback = callback;
      }
    });

    const { result } = renderHook(() => useScroll(100));

    // Initial state should be false
    expect(result.current).toBe(false);

    // Simulate scroll above threshold
    Object.defineProperty(window, "pageYOffset", {
      writable: true,
      configurable: true,
      value: 150,
    });

    act(() => {
      if (scrollCallback) {
        scrollCallback();
      }
    });

    expect(result.current).toBe(true);
  });

  it("should add scroll event listener on mount", () => {
    renderHook(() => useScroll(100));

    expect(mockAddEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );
  });

  it("should remove scroll event listener on unmount", () => {
    const { unmount } = renderHook(() => useScroll(100));

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith(
      "scroll",
      expect.any(Function),
    );
  });

  it("should update scrolled state when scroll event fires", () => {
    let scrollCallback: (() => void) | null = null;

    mockAddEventListener.mockImplementation((event, callback) => {
      if (event === "scroll") {
        scrollCallback = callback;
      }
    });

    const { result } = renderHook(() => useScroll(100));

    // Initial state should be false
    expect(result.current).toBe(false);

    // Simulate scroll above threshold
    Object.defineProperty(window, "pageYOffset", {
      writable: true,
      configurable: true,
      value: 150,
    });

    act(() => {
      if (scrollCallback) {
        scrollCallback();
      }
    });

    expect(result.current).toBe(true);
  });

  it("should handle scroll below threshold after being above", () => {
    let scrollCallback: (() => void) | null = null;

    mockAddEventListener.mockImplementation((event, callback) => {
      if (event === "scroll") {
        scrollCallback = callback;
      }
    });

    const { result } = renderHook(() => useScroll(100));

    // Start above threshold
    Object.defineProperty(window, "pageYOffset", {
      writable: true,
      configurable: true,
      value: 150,
    });

    act(() => {
      if (scrollCallback) {
        scrollCallback();
      }
    });

    expect(result.current).toBe(true);

    // Scroll back below threshold
    Object.defineProperty(window, "pageYOffset", {
      writable: true,
      configurable: true,
      value: 50,
    });

    act(() => {
      if (scrollCallback) {
        scrollCallback();
      }
    });

    expect(result.current).toBe(false);
  });

  it("should work with different threshold values", () => {
    let scrollCallback: (() => void) | null = null;

    mockAddEventListener.mockImplementation((event, callback) => {
      if (event === "scroll") {
        scrollCallback = callback;
      }
    });

    const { result } = renderHook(() => useScroll(200));

    // Set scroll position to 150 (below 200 threshold)
    Object.defineProperty(window, "pageYOffset", {
      writable: true,
      configurable: true,
      value: 150,
    });

    act(() => {
      if (scrollCallback) {
        scrollCallback();
      }
    });

    expect(result.current).toBe(false);

    // Set scroll position to 250 (above 200 threshold)
    Object.defineProperty(window, "pageYOffset", {
      writable: true,
      configurable: true,
      value: 250,
    });

    act(() => {
      if (scrollCallback) {
        scrollCallback();
      }
    });

    expect(result.current).toBe(true);
  });

  it("should handle zero threshold", () => {
    let scrollCallback: (() => void) | null = null;

    mockAddEventListener.mockImplementation((event, callback) => {
      if (event === "scroll") {
        scrollCallback = callback;
      }
    });

    const { result } = renderHook(() => useScroll(0));

    // Any scroll should trigger true
    Object.defineProperty(window, "pageYOffset", {
      writable: true,
      configurable: true,
      value: 1,
    });

    act(() => {
      if (scrollCallback) {
        scrollCallback();
      }
    });

    expect(result.current).toBe(true);
  });

  it("should handle multiple hook instances with different thresholds", () => {
    const scrollCallbacks: (() => void)[] = [];

    mockAddEventListener.mockImplementation((event, callback) => {
      if (event === "scroll") {
        scrollCallbacks.push(callback);
      }
    });

    const { result: result1 } = renderHook(() => useScroll(50));
    const { result: result2 } = renderHook(() => useScroll(100));

    // Initial states should be false
    expect(result1.current).toBe(false);
    expect(result2.current).toBe(false);

    // Set scroll position to 75 (above 50, below 100)
    Object.defineProperty(window, "pageYOffset", {
      writable: true,
      configurable: true,
      value: 75,
    });

    // Trigger scroll events for both hooks
    act(() => {
      scrollCallbacks.forEach((callback) => callback());
    });

    // First hook should be true (75 > 50), second should be false (75 < 100)
    expect(result1.current).toBe(true);
    expect(result2.current).toBe(false);
  });
});
