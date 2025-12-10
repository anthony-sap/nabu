import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Nabu "Etched Slot" Input Style
          "flex w-full h-12 px-4 py-3",
          // Shape
          "rounded-xl",
          // Background: recessed appearance
          "bg-[#F8FAFC] dark:bg-white/5",
          // Border: subtle idle, mint on focus
          "border border-nabu-deep/5 dark:border-white/10",
          // Typography
          "text-base font-medium text-nabu-deep dark:text-white",
          "placeholder:text-nabu-deep/30 dark:placeholder:text-white/30",
          // Focus state: The Mint Line
          "focus:border-nabu-mint focus:ring-1 focus:ring-nabu-mint",
          "focus:outline-none",
          // File input styling
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Transition
          "transition-all duration-200",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
