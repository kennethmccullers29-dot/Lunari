import Link from "next/link";
import { MarketingNav } from "@/components/landing/marketing-nav";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { POSTS } from "@/lib/blog";

const TAG_COLORS: Record<string, string> = {
  Announcement: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Tips:         "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Product:      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

export const metadata = {
  title: "Blog — Lunari",
  description: "News, tips, and product updates from the Lunari team.",
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white text-foreground dark:bg-[#0a0a0a]">
      <MarketingNav />

      <main className="mx-auto max-w-4xl px-6 py-20">
        <div className="mb-14">
          <h1
            className="text-4xl font-bold tracking-tight sm:text-5xl"
            style={{ fontFamily: "var(--font-playfair-display)" }}
          >
            Blog
          </h1>
          <p className="mt-3 text-muted-foreground">
            News, tips, and product updates from the Lunari team.
          </p>
        </div>

        <div className="space-y-6">
          {POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-2xl border border-border bg-white p-7 transition-shadow hover:shadow-md dark:bg-white/[0.03]"
            >
              <div className="mb-3 flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TAG_COLORS[post.tag] ?? "bg-muted text-muted-foreground"}`}
                >
                  {post.tag}
                </span>
                <span className="text-xs text-muted-foreground">{post.date}</span>
              </div>

              <h2 className="mb-2 text-xl font-bold text-foreground transition-colors group-hover:text-[#611f69]">
                {post.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>

              <div className="mt-5 flex items-center gap-2.5">
                <div
                  className="flex size-7 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: post.author.color }}
                >
                  {post.author.initials}
                </div>
                <span className="text-sm text-muted-foreground">{post.author.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
