"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  MessageSquare,
  Users,
  BookOpen,
  Mic,
  Sparkles,
  Paperclip,
  Check,
  ArrowRight,
} from "lucide-react";
import { MarketingNav } from "./marketing-nav";
import { MarketingFooter } from "./marketing-footer";

const FEATURES = [
  {
    icon: MessageSquare,
    title: "Channels",
    desc: "Organize conversations by topic, project, or team — keep everything easy to find.",
  },
  {
    icon: Users,
    title: "Direct Messages",
    desc: "Private 1:1 and group chats with file sharing, reactions, and emoji.",
  },
  {
    icon: BookOpen,
    title: "Team Wiki",
    desc: "A shared knowledge base with rich-text editing that stays current and searchable.",
  },
  {
    icon: Mic,
    title: "Voice Channels",
    desc: "Drop-in voice rooms for quick syncs — no scheduling, no meeting links.",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    desc: "Built-in AI to help your team draft messages, summarize threads, and think faster.",
  },
  {
    icon: Paperclip,
    title: "File Sharing",
    desc: "Share images, files, and GIFs inline in any conversation.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "For small teams getting started.",
    features: [
      "Up to 5 workspace members",
      "90-day message history",
      "Channels & DMs",
      "1 workspace",
    ],
    cta: "Get started free",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$8",
    period: "/user/mo",
    description: "For growing teams that need more.",
    features: [
      "Unlimited members",
      "Unlimited message history",
      "Team Wiki",
      "AI Assistant",
      "Priority support",
    ],
    cta: "Start for free",
    href: "/signup",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$15",
    period: "/user/mo",
    description: "For organizations that need control.",
    features: [
      "Everything in Pro",
      "Advanced admin controls",
      "SSO / SAML (coming soon)",
      "Audit logs (coming soon)",
      "Dedicated support",
    ],
    cta: "Get started",
    href: "/signup",
    highlighted: false,
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-foreground dark:bg-[#0a0a0a]">
      <MarketingNav />

      {/* Hero */}
      <section className="px-4 pb-20 pt-10 sm:px-6">
        <div
          className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl px-8 pb-0 pt-16 text-center"
          style={{ background: "#0d0015" }}
        >
          {/* Animated shader blobs */}
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              animate={{ x: [0, 40, -20, 0], y: [0, -30, 40, 0], scale: [1, 1.15, 0.9, 1] }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -left-20 -top-20 h-[500px] w-[500px] rounded-full"
              style={{ background: "#611f69", filter: "blur(100px)", opacity: 0.55 }}
            />
            <motion.div
              animate={{ x: [0, -50, 30, 0], y: [0, 40, -20, 0], scale: [1, 0.9, 1.2, 1] }}
              transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 3 }}
              className="absolute -right-20 top-10 h-[420px] w-[420px] rounded-full"
              style={{ background: "#7c1fa0", filter: "blur(110px)", opacity: 0.4 }}
            />
            <motion.div
              animate={{ x: [0, 20, -40, 0], y: [0, -40, 20, 0], scale: [1, 1.1, 0.85, 1] }}
              transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 7 }}
              className="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full"
              style={{ background: "#3b0764", filter: "blur(90px)", opacity: 0.5 }}
            />
          </div>

          {/* Subtle grain overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              backgroundSize: "180px",
            }}
          />

          {/* Content */}
          <div className="relative z-10">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm"
            >
              <span className="size-1.5 rounded-full bg-purple-400" />
              Now in beta — free to get started
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mx-auto max-w-4xl text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-playfair-display)" }}
            >
              Where your team{" "}
              <span style={{ color: "#d8a4ff" }}>connects</span>
              <br />
              and{" "}
              <span style={{ color: "#d8a4ff" }}>creates</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-white/55"
            >
              Channels, direct messages, a shared wiki, voice rooms, and AI — everything
              your team needs to do their best work, in one place.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link
                href="/signup"
                className="flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-[#611f69] shadow-lg transition-opacity hover:opacity-90"
              >
                Get started — it&apos;s free
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-xl border border-white/20 px-7 py-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
              >
                Sign in to your workspace
              </Link>
            </motion.div>
          </div>

          {/* App preview mockup */}
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="relative z-10 mx-auto mt-12 max-w-3xl overflow-hidden rounded-t-2xl border border-b-0 border-white/10 shadow-2xl shadow-black/60"
          >
            {/* App chrome */}
            <div className="flex h-9 items-center gap-2 border-b border-white/10 bg-[#1a0025] px-4">
              <div className="size-3 rounded-full bg-red-400/50" />
              <div className="size-3 rounded-full bg-yellow-400/50" />
              <div className="size-3 rounded-full bg-green-400/50" />
              <div className="ml-3 h-5 w-48 rounded-md bg-white/10" />
            </div>
            {/* Sidebar + chat */}
            <div className="flex h-64 bg-[#0d0015]">
              <div className="w-48 shrink-0 border-r border-white/[0.07] bg-[#3f0e40] p-3">
                <div className="mb-3 h-3 w-24 rounded bg-white/20" />
                {[80, 60, 72, 55, 66].map((w, i) => (
                  <div key={i} className="mb-2 flex items-center gap-2">
                    <div className="size-2.5 rounded-sm bg-white/20" />
                    <div className="h-2.5 rounded bg-white/20" style={{ width: w }} />
                  </div>
                ))}
              </div>
              <div className="flex flex-1 flex-col justify-end gap-3 p-5">
                {[
                  { w: "60%", right: false },
                  { w: "45%", right: true },
                  { w: "70%", right: false },
                  { w: "40%", right: true },
                ].map((msg, i) => (
                  <div key={i} className={`flex items-end gap-2 ${msg.right ? "flex-row-reverse" : ""}`}>
                    <div className="size-7 shrink-0 rounded-md bg-white/10" />
                    <div
                      className={`h-7 rounded-xl ${msg.right ? "bg-purple-600/50" : "bg-white/10"}`}
                      style={{ width: msg.w }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-28 dark:bg-white/[0.01]">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything your team needs
            </h2>
            <p className="mt-3 text-muted-foreground">
              One workspace. No context switching.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className="group rounded-2xl border border-border bg-white p-6 transition-shadow hover:shadow-md dark:bg-white/[0.03]"
              >
                <div
                  className="mb-4 flex size-10 items-center justify-center rounded-xl transition-colors group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30"
                  style={{ backgroundColor: "#611f6910" }}
                >
                  <feature.icon className="size-5" style={{ color: "#611f69" }} />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-muted/30 py-28 dark:bg-white/[0.02]">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-3 text-muted-foreground">
              Start free. Upgrade when your team grows. Cancel anytime.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-3">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className={`relative flex flex-col rounded-2xl border bg-white p-7 dark:bg-[#0a0a0a] ${
                  plan.highlighted
                    ? "border-purple-300 shadow-xl dark:border-purple-800"
                    : "border-border"
                }`}
              >
                {plan.highlighted && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: "#611f69" }}
                  >
                    Most popular
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    {plan.period && (
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    )}
                  </div>
                </div>

                <ul className="mb-7 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                      <Check className="size-4 shrink-0" style={{ color: "#611f69" }} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 ${
                    plan.highlighted
                      ? "text-white"
                      : "border border-border bg-background text-foreground hover:bg-muted"
                  }`}
                  style={plan.highlighted ? { backgroundColor: "#611f69" } : undefined}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl px-6 text-center"
        >
          <h2
            className="text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ fontFamily: "var(--font-playfair-display)" }}
          >
            Ready to bring your team together?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Set up your workspace in minutes. No credit card required.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#611f69", boxShadow: "0 8px 32px #611f6930" }}
          >
            Create your free workspace
            <ArrowRight className="size-4" />
          </Link>
        </motion.div>
      </section>

      <MarketingFooter />
    </div>
  );
}
