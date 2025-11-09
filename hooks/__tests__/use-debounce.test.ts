import React from "react";
import { act, renderHook } from "@testing-library/react";

import { useDebounce } from "../use-debounce";

describe("useDebounce", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should debounce function calls", () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebounce());

    // Call debounce function multiple times
    act(() => {
      result.current.debounceFunction({ callback, delay: 100 });
      result.current.debounceFunction({ callback, delay: 100 });
      result.current.debounceFunction({ callback, delay: 100 });
    });

    // Callback should not be called immediately
    expect(callback).not.toHaveBeenCalled();

    // Fast forward time to trigger the debounced call
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Callback should be called only once
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should clear previous timer when called again", () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebounce());

    // First call
    act(() => {
      result.current.debounceFunction({ callback, delay: 100 });
    });

    // Advance time but not enough to trigger
    act(() => {
      jest.advanceTimersByTime(50);
    });

    // Second call should clear the previous timer
    act(() => {
      result.current.debounceFunction({ callback, delay: 100 });
    });

    // Advance time to trigger the second call
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Callback should be called only once (from the second call)
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should execute callback after specified delay", () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useDebounce());

    act(() => {
      result.current.debounceFunction({ callback, delay: 500 });
    });

    // Callback should not be called before delay
    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(callback).not.toHaveBeenCalled();

    // Callback should be called after delay
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should handle multiple debounce instances independently", () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    const { result: result1 } = renderHook(() => useDebounce());
    const { result: result2 } = renderHook(() => useDebounce());

    act(() => {
      result1.current.debounceFunction({ callback: callback1, delay: 100 });
      result2.current.debounceFunction({ callback: callback2, delay: 200 });
    });

    // Advance time to trigger first callback
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).not.toHaveBeenCalled();

    // Advance time to trigger second callback
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
  });
});
