import React from "react";
import { act, renderHook } from "@testing-library/react";

import useIntersectionObserver from "../use-intersection-observer";

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
const mockDisconnect = jest.fn();
const mockObserve = jest.fn();

describe("useIntersectionObserver", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock IntersectionObserver
    mockIntersectionObserver.mockImplementation((callback) => ({
      observe: mockObserve,
      disconnect: mockDisconnect,
    }));

    // Mock window.IntersectionObserver
    Object.defineProperty(window, "IntersectionObserver", {
      writable: true,
      configurable: true,
      value: mockIntersectionObserver,
    });
  });

  it("should create intersection observer with default options", () => {
    const ref = { current: document.createElement("div") };
    renderHook(() => useIntersectionObserver(ref, {}));

    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      {
        threshold: 0,
        root: null,
        rootMargin: "0%",
      },
    );
    expect(mockObserve).toHaveBeenCalledWith(ref.current);
  });

  it("should create intersection observer with custom options", () => {
    const ref = { current: document.createElement("div") };
    const options = {
      threshold: 0.5,
      root: document.body,
      rootMargin: "10px",
      freezeOnceVisible: true,
    };

    renderHook(() => useIntersectionObserver(ref, options));

    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      {
        threshold: 0.5,
        root: document.body,
        rootMargin: "10px",
      },
    );
  });

  it("should not create observer when element ref is null", () => {
    const ref = { current: null } as unknown as React.RefObject<Element>;
    renderHook(() => useIntersectionObserver(ref, {}));

    expect(mockIntersectionObserver).not.toHaveBeenCalled();
    expect(mockObserve).not.toHaveBeenCalled();
  });

  it("should not create observer when IntersectionObserver is not supported", () => {
    // Mock IntersectionObserver as undefined
    Object.defineProperty(window, "IntersectionObserver", {
      writable: true,
      configurable: true,
      value: undefined,
    });

    const ref = { current: document.createElement("div") };
    renderHook(() => useIntersectionObserver(ref, {}));

    expect(mockObserve).not.toHaveBeenCalled();
  });

  it("should disconnect observer on cleanup", () => {
    const ref = { current: document.createElement("div") };
    const { unmount } = renderHook(() => useIntersectionObserver(ref, {}));

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("should update entry when intersection occurs", () => {
    const ref = { current: document.createElement("div") };
    const { result } = renderHook(() => useIntersectionObserver(ref, {}));

    // Simulate intersection observer callback
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];
    const mockEntry = {
      isIntersecting: true,
      intersectionRatio: 1,
      target: ref.current,
    };

    act(() => {
      observerCallback([mockEntry]);
    });

    expect(result.current).toEqual(mockEntry);
  });

  it("should freeze observer when freezeOnceVisible is true and element is intersecting", () => {
    const ref = { current: document.createElement("div") };
    const { result, rerender } = renderHook(() =>
      useIntersectionObserver(ref, { freezeOnceVisible: true }),
    );

    // Simulate intersection observer callback
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];
    const mockEntry = {
      isIntersecting: true,
      intersectionRatio: 1,
      target: ref.current,
    };

    act(() => {
      observerCallback([mockEntry]);
    });

    // Clear mocks to check if new observer is created
    mockIntersectionObserver.mockClear();
    mockObserve.mockClear();

    // Rerender should not create new observer when frozen
    rerender();

    expect(mockIntersectionObserver).not.toHaveBeenCalled();
    expect(mockObserve).not.toHaveBeenCalled();
  });

  it("should not freeze observer when freezeOnceVisible is false", () => {
    const ref = { current: document.createElement("div") };
    const initialProps = { threshold: 0, freezeOnceVisible: false };
    const { result, rerender } = renderHook(
      (props) => useIntersectionObserver(ref, props),
      { initialProps },
    );

    // Simulate intersection observer callback
    const observerCallback = mockIntersectionObserver.mock.calls[0][0];
    const mockEntry = {
      isIntersecting: true,
      intersectionRatio: 1,
      target: ref.current,
    };

    act(() => {
      observerCallback([mockEntry]);
    });

    // Clear mocks to check if new observer is created
    mockIntersectionObserver.mockClear();
    mockObserve.mockClear();

    // Rerender with different options should create new observer when not frozen
    rerender({ threshold: 0.5, freezeOnceVisible: false });

    expect(mockIntersectionObserver).toHaveBeenCalled();
    expect(mockObserve).toHaveBeenCalled();
  });

  it("should handle multiple intersection updates", () => {
    const ref = { current: document.createElement("div") };
    const { result } = renderHook(() => useIntersectionObserver(ref, {}));

    const observerCallback = mockIntersectionObserver.mock.calls[0][0];

    // First intersection
    const firstEntry = {
      isIntersecting: true,
      intersectionRatio: 0.5,
      target: ref.current,
    };
    act(() => {
      observerCallback([firstEntry]);
    });
    expect(result.current).toEqual(firstEntry);

    // Second intersection
    const secondEntry = {
      isIntersecting: false,
      intersectionRatio: 0,
      target: ref.current,
    };
    act(() => {
      observerCallback([secondEntry]);
    });
    expect(result.current).toEqual(secondEntry);
  });
});
