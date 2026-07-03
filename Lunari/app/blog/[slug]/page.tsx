import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MarketingNav } from "@/components/landing/marketing-nav";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { getPost } from "@/lib/blog";

const TAG_COLORS: Record<string, string> = {
  Announcement: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  Tips:         "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Product:      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return { title: `${post.title} — Lunari Blog`, description: post.excerpt };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-white text-foreground dark:bg-[#0a0a0a]">
      <MarketingNav />

      <main className="mx-auto max-w-2xl px-6 py-20">
        <Link
          href="/blog"
          className="mb-10 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to blog
        </Link>

        {/* Header */}
        <div className="mb-12">
          <div className="mb-4 flex items-center gap-3">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TAG_COLORS[post.tag] ?? "bg-muted text-muted-foreground"}`}
            >
              {post.tag}
            </span>
            <span className="text-xs text-muted-foreground">{post.date}</span>
          </div>

          <h1
            className="text-3xl font-bold leading-snug tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-playfair-display)" }}
          >
            {post.title}
          </h1>

          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>

          <div className="mt-6 flex items-center gap-2.5 border-t border-border pt-6">
            <div
              className="flex size-8 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: post.author.color }}
            >
              {post.author.initials}
            </div>
            <span className="text-sm font-medium text-foreground">{post.author.name}</span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-5 text-[15px] leading-relaxed text-foreground">
          {post.content.map((block, i) => {
            if (block.type === "p") {
              return (
                <p key={i} className="text-muted-foreground">
                  {block.text}
                </p>
              );
            }
            if (block.type === "h2") {
              return (
                <h2 key={i} className="pt-4 text-xl font-bold text-foreground">
                  {block.text}
                </h2>
              );
            }
            if (block.type === "h3") {
              return (
                <h3 key={i} className="pt-2 text-lg font-semibold text-foreground">
                  {block.text}
                </h3>
              );
            }
            if (block.type === "ul") {
              return (
                <ul key={i} className="space-y-2 pl-1">
                  {block.items?.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-muted-foreground">
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: "#611f69" }}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              );
            }
            return null;
          })}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-border bg-muted/30 p-8 text-center dark:bg-white/[0.02]">
          <p className="font-semibold text-foreground">Ready to try Lunari?</p>
          <p className="mt-1 text-sm text-muted-foreground">Free to get started. No credit card required.</p>
          <Link
            href="/signup"
            className="mt-5 inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#611f69" }}
          >
            Get started free
          </Link>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
