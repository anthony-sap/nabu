"use client";

import Image from "next/image";
import { MessageCircle, FolderOpen, LayoutGrid, Bookmark, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/shared/icons";
import { UserAccountNav } from "@/components/layout/user-account-nav";

/**
 * NavigationRail - Slim vertical navigation strip on the far left
 * 
 * Button Styling:
 * - Ghost buttons with Nabu spec: transparent → subtle wash on hover
 * - Active state: Mint tint with ring
 */

// Ghost icon button styling following Nabu spec
const ghostIconStyles = cn(
  "w-10 h-10 flex items-center justify-center rounded-xl",
  "text-[rgb(var(--nabu-deep))]/60 dark:text-white/60",
  "bg-transparent",
  "hover:bg-[rgb(var(--nabu-deep))]/5 dark:hover:bg-white/10",
  "hover:text-[rgb(var(--nabu-deep))] dark:hover:text-white",
  "transition-all duration-200"
);

// Active icon button styling
const activeIconStyles = cn(
  "w-10 h-10 flex items-center justify-center rounded-xl",
  "bg-[rgb(var(--nabu-mint))]/15 text-[rgb(var(--nabu-mint))]",
  "ring-1 ring-[rgb(var(--nabu-mint))]/20"
);

export function NavigationRail() {
  const { setTheme } = useTheme();

  return (
    <TooltipProvider delayDuration={100}>
      {/* Navigation Rail - Glass Layer catching atmosphere */}
      <nav className="flex-shrink-0 w-16 h-full flex flex-col items-center py-4 
                      bg-white/30 dark:bg-[#071633]/30 
                      backdrop-blur-xl 
                      border-r border-white/40 dark:border-white/10">
        {/* App Logo - Top */}
        <div className="mb-6">
          <div className="h-10 w-10 rounded-xl bg-[rgb(var(--nabu-mint))]/10 relative flex items-center justify-center ring-1 ring-[rgb(var(--nabu-mint))]/20">
            <Image 
              src="/nabu_logo.png" 
              alt="Nabu" 
              width={24}
              height={24}
              className="w-6 h-6"
            />
          </div>
        </div>

        {/* Page Navigation Icons */}
        <div className="flex flex-col items-center gap-2">
          {/* Chat Icon - Ghost */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className={ghostIconStyles}>
                <MessageCircle className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Chat</TooltipContent>
          </Tooltip>

          {/* Notes Icon - Active */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className={activeIconStyles}>
                <FolderOpen className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Notes</TooltipContent>
          </Tooltip>

          {/* Dashboard Icon - Ghost */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className={ghostIconStyles}>
                <LayoutGrid className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Dashboard</TooltipContent>
          </Tooltip>

          {/* Bookmarks Icon - Ghost */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className={ghostIconStyles}>
                <Bookmark className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Bookmarks</TooltipContent>
          </Tooltip>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom Actions - Theme Toggle, Settings, Profile */}
        <div className="flex flex-col items-center gap-2">
          {/* Theme Toggle */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button className={ghostIconStyles}>
                    <Icons.sun className="h-5 w-5 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
                    <Icons.moon className="absolute h-5 w-5 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
                    <span className="sr-only">Toggle theme</span>
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">Theme</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" side="right">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Icons.sun className="mr-2 h-4 w-4" />
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Icons.moon className="mr-2 h-4 w-4" />
                Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Icons.laptop className="mr-2 h-4 w-4" />
                System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings - Ghost */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className={ghostIconStyles}>
                <Settings className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>

          {/* User Profile */}
          <div className="mt-1">
            <UserAccountNav />
          </div>
        </div>
      </nav>
    </TooltipProvider>
  );
}
