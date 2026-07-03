import { MarketingNav } from "@/components/landing/marketing-nav";
import { MarketingFooter } from "@/components/landing/marketing-footer";

export const metadata = {
  title: "Changelog — Lunari",
  description: "What's new in Lunari.",
};

const RELEASES = [
  {
    version: "0.3.0",
    date: "June 28, 2026",
    tag: "Latest",
    changes: [
      { type: "new", text: "AI Assistant — ask questions, draft messages, and summarize threads" },
      { type: "new", text: "Voice channels — drop-in audio rooms directly in the sidebar" },
      { type: "new", text: "Payments & billing — Free, Pro, and Business plans via Stripe" },
      { type: "new", text: "Landing page with blog and changelog" },
      { type: "improved", text: "Mobile-responsive layout across the entire app" },
      { type: "improved", text: "Animations and transitions throughout the UI" },
    ],
  },
  {
    version: "0.2.0",
    date: "June 10, 2026",
    tag: null,
    changes: [
      { type: "new", text: "Team Wiki — Notion-style pages with rich-text editing and auto-save" },
      { type: "new", text: "File & image sharing in messages" },
      { type: "new", text: "GIF picker powered by Giphy" },
      { type: "new", text: "Emoji reactions on messages" },
      { type: "new", text: "Do Not Disturb mode" },
      { type: "improved", text: "Dark / light / system theme switcher" },
      { type: "improved", text: "Notification toasts" },
    ],
  },
  {
    version: "0.1.0",
    date: "May 20, 2026",
    tag: null,
    changes: [
      { type: "new", text: "Workspaces with invite links" },
      { type: "new", text: "Channels and direct messages" },
      { type: "new", text: "Real-time messaging via Supabase Realtime" },
      { type: "new", text: "User authentication (email + MFA)" },
      { type: "new", text: "User profiles and avatars" },
    ],
  },
];

const TYPE_STYLES = {
  new:      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  improved: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  fixed:    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

const TYPE_LABELS = { new: "New", improved: "Improved", fixed: "Fixed" };

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-white text-foreground dark:bg-[#0a0a0a]">
      <MarketingNav />

      <main className="mx-auto max-w-2xl px-6 py-20">
        <div className="mb-14">
          <h1
            className="text-4xl font-bold tracking-tight sm:text-5xl"
            style={{ fontFamily: "var(--font-playfair-display)" }}
          >
            Changelog
          </h1>
          <p className="mt-3 text-muted-foreground">
            Every update to Lunari, newest first.
          </p>
        </div>

        <div className="relative space-y-12 before:absolute before:left-[5.5rem] before:top-2 before:h-full before:w-px before:bg-border">
          {RELEASES.map((release) => (
            <div key={release.version} className="relative flex gap-8">
              {/* Date + version */}
              <div className="w-20 shrink-0 pt-0.5 text-right">
                <p className="text-xs font-semibold text-foreground">{release.version}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{release.date}</p>
              </div>

              {/* Dot */}
              <div
                className="absolute left-[5rem] top-1.5 size-3 rounded-full border-2 border-background"
                style={{ backgroundColor: "#611f69" }}
              />

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="mb-4 flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">v{release.version}</h2>
                  {release.tag && (
                    <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                      {release.tag}
                    </span>
                  )}
                </div>

                <ul className="space-y-2.5">
                  {release.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${TYPE_STYLES[change.type as keyof typeof TYPE_STYLES]}`}
                      >
                        {TYPE_LABELS[change.type as keyof typeof TYPE_LABELS]}
                      </span>
                      <span className="text-sm text-muted-foreground">{change.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
