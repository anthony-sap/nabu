"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { nabuNavLinks } from "@/config/nabu";

/**
 * Navigation component for the Nabu section
 * Displays navigation links with active state highlighting
 */
export function NabuNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-6">
      {nabuNavLinks.map((link) => (
        <Link
          key={link.href}
          href={link.href || "#"}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            pathname === link.href
              ? "text-foreground"
              : "text-muted-foreground"
          )}
        >
          {link.title}
        </Link>
      ))}
    </nav>
  );
}

