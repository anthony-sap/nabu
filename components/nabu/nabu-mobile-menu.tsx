"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { nabuNavLinks } from "@/config/nabu";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

/**
 * Mobile menu component for the Nabu section
 * Provides a hamburger menu with navigation links for mobile devices
 */
export function NabuMobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[240px] sm:w-[280px]">
        <div className="flex flex-col gap-6 py-6">
          {/* Brand */}
          <div className="flex items-center gap-2 px-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 relative">
            <img src="/static/logo.png" alt="Nabu" className="absolute inset-0 m-2 fill-[var(--nabu-mint)]"/>

            </div>
            <span className="font-serif font-bold text-lg">Nabu</span>
          </div>

          {/* Navigation links */}
          <nav className="flex flex-col gap-2">
            {nabuNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href || "#"}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {link.title}
              </Link>
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}

