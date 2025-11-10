"use client";

import Link from "next/link";
import { LoginLink, useKindeAuth } from "@kinde-oss/kinde-auth-nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function NabuHeader() {
  const { accessToken, isAuthenticated, isLoading } = useKindeAuth();

  return (
    <header className="sticky top-0 z-40 bg-[#0a1428]/70 backdrop-blur border-b border-white/5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <Link href="/nabu" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-[var(--nabu-deep)] relative shadow-inner ring-1 ring-white/10">
              <div className="absolute inset-1 rounded-2xl bg-[var(--nabu-deep)]"/>
              {/* Mint tablet minimal glyph */}
              <svg viewBox="0 0 100 100" className="absolute inset-0 m-2 fill-[var(--nabu-mint)]">
                <rect x="18" y="20" width="64" height="10" rx="5"/>
                <path d="M29 70 a7 7 0 1 0 18 0 a7 7 0 1 0 -18 0"/>
                <path d="M42 46 c20 5 25 37 25 37 c-9 4 -19 2 -28 -6 c-8 -7 -7 -30 3 -31z"/>
                <path d="M69 44 a8 10 0 1 0 0 20 a8 10 0 1 0 0 -20"/>
              </svg>
            </div>
            <span className="text-xl font-serif">Nabu</span>
          </Link>
          <Badge variant="secondary" className="bg-white/10 text-white/80 border-white/10 hover:bg-white/15">
            Beta
          </Badge>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-white/80">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how" className="hover:text-white transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated && accessToken ? (
            <>
              <Button 
                variant="outline" 
                size="lg" 
                rounded="2xl" 
                asChild 
                className="border-white/15 hover:bg-white/5 hover:border-white/35 text-white"
              >
                <a href="#demo">Live demo</a>
              </Button>
              <Button 
                size="lg" 
                rounded="2xl" 
                asChild 
                className="bg-[#00B3A6] hover:bg-[#00B3A6]/90 text-[#071633] shadow-lg shadow-[#00B3A6]/20"
              >
                <Link
                  href={
                    accessToken?.roles?.find((role) => role.key === "ADMIN")
                      ? "/admin"
                      : "/dashboard"
                  }
                >
                  Dashboard
                </Link>
              </Button>
            </>
          ) : !isAuthenticated && !isLoading ? (
            <>
              <Button 
                variant="outline" 
                size="lg" 
                rounded="2xl" 
                asChild 
                className="border-white/15 hover:bg-white/5 hover:border-white/35 text-white"
              >
                <a href="#demo">Live demo</a>
              </Button>
              <LoginLink>
                <Button 
                  size="lg" 
                  rounded="2xl" 
                  className="bg-[#00B3A6] hover:bg-[#00B3A6]/90 text-[#071633] shadow-lg shadow-[#00B3A6]/20"
                >
                  Start free
                </Button>
              </LoginLink>
            </>
          ) : (
            <>
              <Skeleton className="h-11 w-24 rounded-2xl bg-white/10" />
              <Skeleton className="h-11 w-28 rounded-2xl bg-white/10" />
            </>
          )}
        </div>
      </div>
    </header>
  );
}

