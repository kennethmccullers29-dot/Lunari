import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground sm:flex-row">
        <span className="text-base font-bold tracking-tight" style={{ color: "#611f69" }}>
          Lunari
        </span>
        <div className="flex items-center gap-6">
          <Link href="/blog" className="transition-colors hover:text-foreground">Blog</Link>
          <Link href="/changelog" className="transition-colors hover:text-foreground">Changelog</Link>
          <a href="#" className="transition-colors hover:text-foreground">Privacy</a>
          <a href="#" className="transition-colors hover:text-foreground">Terms</a>
          <a href="#" className="transition-colors hover:text-foreground">Contact</a>
        </div>
        <p>© 2026 Lunari. All rights reserved.</p>
      </div>
    </footer>
  );
}
