"use client";

import { NavigationRail } from "./navigation-rail";

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * AppShell - Main application wrapper with NavigationRail and content area
 * 
 * Layout structure:
 * - NavigationRail (far left) - slim vertical nav strip
 * - Children (rest of content) - includes sidebar + main content panel
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Navigation Rail - Far left */}
      <NavigationRail />

      {/* Content Area - Contains sidebar and main panel */}
      <div className="flex-1 flex min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

