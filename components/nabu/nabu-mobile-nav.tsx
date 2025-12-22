"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoginLink, useKindeAuth } from "@kinde-oss/kinde-auth-nextjs";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function NabuMobileNav() {
  const { accessToken, isAuthenticated } = useKindeAuth();
  const [open, setOpen] = useState(false);

  // prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [open]);

  const navLinks = [
    { title: "Features", href: "#features" },
    { title: "How it works", href: "#how" },
    { title: "Pricing", href: "#pricing" },
    { title: "FAQ", href: "#faq" },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed top-2.5 right-2 z-50 rounded-full p-2 transition-colors duration-200 focus:outline-none md:hidden",
          open 
            ? "bg-white/10 hover:bg-white/15" 
            : "bg-white/5 hover:bg-white/10",
        )}
        aria-label="Toggle menu"
      >
        {open ? (
          <X className="size-5 text-white" />
        ) : (
          <Menu className="size-5 text-white" />
        )}
      </button>

      <nav
        className={cn(
          "fixed inset-0 z-20 hidden w-full overflow-auto bg-[#0a1428] px-5 py-16 md:hidden",
          open && "block",
        )}
      >
        <ul className="grid divide-y divide-white/10">
          {navLinks.map(({ title, href }) => (
            <li key={href} className="py-3">
              <a
                href={href}
                onClick={() => setOpen(false)}
                className="flex w-full font-medium text-white hover:text-[#00B3A6] transition-colors"
              >
                {title}
              </a>
            </li>
          ))}

          <li className="py-3">
            <a
              href="#demo"
              onClick={() => setOpen(false)}
              className="flex w-full font-medium text-white hover:text-[#00B3A6] transition-colors"
            >
              Live demo
            </a>
          </li>

          {isAuthenticated && accessToken ? (
            <>
              {accessToken?.roles?.find((role) => role.key === "ADMIN") && (
                <li className="py-3">
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex w-full font-medium text-white hover:text-[#00B3A6] transition-colors"
                  >
                    Admin
                  </Link>
                </li>
              )}
              <li className="py-3">
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex w-full font-medium text-white hover:text-[#00B3A6] transition-colors"
                >
                  Dashboard
                </Link>
              </li>
            </>
          ) : (
            <li className="py-3">
              <LoginLink
                onClick={() => setOpen(false)}
                className="flex w-full font-medium text-[#00B3A6] hover:text-[#00B3A6]/80 transition-colors"
              >
                Start free
              </LoginLink>
            </li>
          )}
        </ul>
      </nav>
    </>
  );
}

