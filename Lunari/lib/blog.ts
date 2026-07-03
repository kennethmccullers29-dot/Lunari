export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  tag: string;
  author: { name: string; initials: string; color: string };
  content: { type: "p" | "h2" | "h3" | "ul"; text?: string; items?: string[] }[];
};

export const POSTS: Post[] = [
  {
    slug: "introducing-lunari",
    title: "Introducing Lunari: A New Way for Teams to Communicate",
    excerpt:
      "We built Lunari because we were tired of jumping between five different tools just to get work done. Here's the story behind it.",
    date: "June 28, 2026",
    tag: "Announcement",
    author: { name: "The Lunari Team", initials: "LT", color: "#611f69" },
    content: [
      {
        type: "p",
        text: "We've been building Lunari for the past year and today we're excited to open the doors. It's a team communication app that brings channels, direct messages, a shared wiki, voice rooms, and an AI assistant into one place.",
      },
      {
        type: "h2",
        text: "Why we built it",
      },
      {
        type: "p",
        text: "Most teams we talked to were running their communication across at least three tools — a chat app, a docs tool, and something for calls. Switching between them breaks focus and buries context. We wanted to fix that.",
      },
      {
        type: "h2",
        text: "What's in the box",
      },
      {
        type: "ul",
        items: [
          "Channels for organized, topic-based conversations",
          "Direct messages for private 1:1 and group chats",
          "A Team Wiki for shared knowledge that stays up to date",
          "Voice channels you can drop into without scheduling a meeting",
          "A built-in AI assistant for drafting, summarizing, and thinking out loud",
        ],
      },
      {
        type: "p",
        text: "We're launching in beta today. It's free to get started and we'd love your feedback.",
      },
    ],
  },
  {
    slug: "5-tips-for-better-async-communication",
    title: "5 Tips for Better Async Communication on Remote Teams",
    excerpt:
      "Async-first teams move faster and burn out less. Here are five habits that make the difference.",
    date: "June 20, 2026",
    tag: "Tips",
    author: { name: "The Lunari Team", initials: "LT", color: "#611f69" },
    content: [
      {
        type: "p",
        text: "Remote teams that get async communication right feel like they have a superpower. Work happens across time zones, decisions get made without everyone in the same meeting, and deep focus time is protected. Here's how to build those habits.",
      },
      {
        type: "h2",
        text: "1. Default to writing things down",
      },
      {
        type: "p",
        text: "If you made a decision in a call, write a summary in the relevant channel. If you're starting a project, write a brief doc. The written record is what keeps async teams aligned.",
      },
      {
        type: "h2",
        text: "2. Use threads to keep channels clean",
      },
      {
        type: "p",
        text: "Threads let conversations branch off without flooding the main channel. They're especially useful for feedback rounds and back-and-forth discussions.",
      },
      {
        type: "h2",
        text: "3. Set clear response time expectations",
      },
      {
        type: "p",
        text: "Not everything needs an immediate reply. Agree as a team on what response window is normal for different channels — e.g. 4 hours for general, 24 hours for non-urgent topics.",
      },
      {
        type: "h2",
        text: "4. Keep a wiki for evergreen information",
      },
      {
        type: "p",
        text: "FAQs, onboarding docs, decisions — anything that gets asked more than twice belongs in the wiki, not buried in chat history.",
      },
      {
        type: "h2",
        text: "5. Over-communicate context",
      },
      {
        type: "p",
        text: "When you can't read the room, add more context than you think is necessary. A message like \"FYI this is blocking the deploy\" lands very differently from just the question.",
      },
    ],
  },
  {
    slug: "team-wiki-launch",
    title: "Introducing the Team Wiki",
    excerpt:
      "Channels are great for conversations. But some information needs a permanent home. Meet the Lunari Team Wiki.",
    date: "June 10, 2026",
    tag: "Product",
    author: { name: "The Lunari Team", initials: "LT", color: "#611f69" },
    content: [
      {
        type: "p",
        text: "Today we're shipping the Team Wiki — a shared knowledge base that lives right inside Lunari. No more copy-pasting answers from Slack into Notion and back.",
      },
      {
        type: "h2",
        text: "How it works",
      },
      {
        type: "p",
        text: "Every workspace gets a wiki. You can create pages, organize them with emoji icons, and edit with a full rich-text editor. Pages auto-save as you type, so there's no save button to forget.",
      },
      {
        type: "h2",
        text: "What to put in it",
      },
      {
        type: "ul",
        items: [
          "Team norms and working agreements",
          "How-to guides and runbooks",
          "Meeting notes and decision logs",
          "Onboarding docs for new hires",
          "Anything that gets asked more than twice in chat",
        ],
      },
      {
        type: "p",
        text: "The wiki is available on all plans today. Head to your workspace and click the Wiki icon in the sidebar to get started.",
      },
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
