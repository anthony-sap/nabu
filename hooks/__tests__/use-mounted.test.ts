import React from "react";
import { renderHook } from "@testing-library/react";

import { useMounted } from "../use-mounted";

describe("useMounted", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true after component mounts", () => {
    const { result } = renderHook(() => useMounted());

    // The hook should return true after the initial render due to useEffect
    expect(result.current).toBe(true);
  });

  it("should maintain true value after mount", () => {
    const { result, rerender } = renderHook(() => useMounted());

    // After initial mount
    expect(result.current).toBe(true);

    // Re-render should still return true
    rerender();
    expect(result.current).toBe(true);
  });

  it("should work correctly in multiple hook instances", () => {
    const { result: result1 } = renderHook(() => useMounted());
    const { result: result2 } = renderHook(() => useMounted());

    expect(result1.current).toBe(true);
    expect(result2.current).toBe(true);
  });
});
