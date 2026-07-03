"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../optics/button";

export function MarketingNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div className="sticky top-4 z-50 px-4 sm:px-6">
      <header className="mx-auto flex h-14 max-w-5xl items-center rounded-2xl border border-black/[0.08] bg-white/80 px-5 shadow-sm backdrop-blur-md dark:border-white/[0.08] dark:bg-[#0a0a0a]/80">
        {/* Left */}
        <div className="flex flex-1 items-center">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight"
            style={{ color: "#611f69" }}
          >
            Lunari
          </Link>
        </div>

        {/* Center */}
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link
            href={isHome ? "#features" : "/#features"}
            className="transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link href="/blog" className="transition-colors hover:text-foreground">
            Blog
          </Link>
          <Link href="/changelog" className="transition-colors hover:text-foreground">
            Changelog
          </Link>
          <Link
            href={isHome ? "#pricing" : "/#pricing"}
            className="transition-colors hover:text-foreground"
          >
            Pricing
          </Link>
        </nav>

        {/* Right */}
        <div className="flex flex-1 items-center justify-end gap-3">
          <Link
            href="/login"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground md:block"
          >
            Sign in
          </Link>
          
          <Button variant="default" size="lg">
            <Link href="/signup">
            Get started free
            </Link>
          </Button>
        </div>
      </header>
    </div>
  );
}
