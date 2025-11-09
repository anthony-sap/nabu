"use client";

import { useRef } from "react";

export type DebounceProps = {
  callback: () => void;
  delay: number;
};

export const useDebounce = () => {
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const debounceFunction = ({ callback, delay }: DebounceProps) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      callback();
    }, delay);
  };

  return {
    debounceFunction,
  };
};
