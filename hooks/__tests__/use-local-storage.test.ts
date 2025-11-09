import React from "react";
import { act, renderHook } from "@testing-library/react";

import useLocalStorage from "../use-local-storage";

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

describe("useLocalStorage", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock window.localStorage
    Object.defineProperty(window, "localStorage", {
      writable: true,
      configurable: true,
      value: mockLocalStorage,
    });
  });

  it("should initialize with default value when localStorage is empty", () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() =>
      useLocalStorage("test-key", "default-value"),
    );

    expect(result.current[0]).toBe("default-value");
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith("test-key");
  });

  it("should load value from localStorage on initialization", () => {
    const storedValue = { name: "test", count: 42 };
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedValue));

    const { result } = renderHook(() => useLocalStorage("test-key", {}));

    expect(result.current[0]).toEqual(storedValue);
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith("test-key");
  });

  it("should set value and save to localStorage", () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useLocalStorage("test-key", "initial"));

    act(() => {
      result.current[1]("new-value");
    });

    expect(result.current[0]).toBe("new-value");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "test-key",
      '"new-value"',
    );
  });

  it("should handle complex objects", () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useLocalStorage("test-key", {}));

    const complexObject = {
      user: { id: 1, name: "John" },
      settings: { theme: "dark", notifications: true },
      timestamp: Date.now(),
    };

    act(() => {
      result.current[1](complexObject);
    });

    expect(result.current[0]).toEqual(complexObject);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "test-key",
      JSON.stringify(complexObject),
    );
  });

  it("should handle arrays", () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() =>
      useLocalStorage("test-key", [] as string[]),
    );

    const testArray = ["item1", "item2", "item3"];

    act(() => {
      result.current[1](testArray);
    });

    expect(result.current[0]).toEqual(testArray);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "test-key",
      JSON.stringify(testArray),
    );
  });

  it("should handle primitive values", () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useLocalStorage("test-key", 0));

    act(() => {
      result.current[1](42);
    });

    expect(result.current[0]).toBe(42);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("test-key", "42");
  });

  it("should handle boolean values", () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useLocalStorage("test-key", false));

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("test-key", "true");
  });

  it("should handle null values", () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useLocalStorage("test-key", null));

    act(() => {
      result.current[1](null);
    });

    expect(result.current[0]).toBe(null);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("test-key", "null");
  });

  it("should update value when key changes", () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result, rerender } = renderHook(
      ({ key }) => useLocalStorage(key, "default"),
      { initialProps: { key: "key1" } },
    );

    // Change the key
    rerender({ key: "key2" });

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith("key2");
  });

  it("should handle multiple instances with different keys", () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result: result1 } = renderHook(() =>
      useLocalStorage("key1", "default1"),
    );
    const { result: result2 } = renderHook(() =>
      useLocalStorage("key2", "default2"),
    );

    act(() => {
      result1.current[1]("value1");
      result2.current[1]("value2");
    });

    expect(result1.current[0]).toBe("value1");
    expect(result2.current[0]).toBe("value2");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("key1", '"value1"');
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith("key2", '"value2"');
  });
});
