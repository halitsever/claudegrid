import { defineConfig } from "vitepress";

const hostname = "https://projects.halit.org";
const base = "/claudegrid/";
const siteUrl = hostname + base;
const BLOG: [string, string][] = [
  ["tmux-detach", "tmux detach"],
  ["tmux-split-panes", "tmux split panes"],
  ["git-worktree-add", "git worktree add"],
  ["what-is-a-git-worktree", "What is a git worktree?"],
  ["git-worktree-remove", "git worktree remove and prune"],
  ["xterm-kitty-unknown-terminal-type", "xterm-kitty unknown terminal"],
  ["git-worktree-vs-clone", "Worktree vs clone vs branch"],
  ["iterm2-split-pane", "iTerm2 split panes"],
  ["tmux-cheat-sheet", "tmux cheat sheet"],
  ["tmux-scroll-up", "tmux scroll up"],
  ["tmux-kill-session", "tmux kill session"],
  ["tmux-vs-screen", "tmux vs screen"],
  ["tmux-config", "tmux config file"],
  ["tmux-rename-window", "tmux rename window"],
];
const author = { "@type": "Person", name: "Halit Sever", url: "https://halit.org" };

const description = "Run multiple Claude Code agents in parallel in tmux, Konsole, iTerm2, kitty or WezTerm on Linux and macOS, with a prompt, model and git worktree per pane.";

export default defineConfig({
  /** keeps the page hash map out of every page's HTML, which Semrush reads as a low text-to-HTML ratio */
  metaChunk: true,
  lang: "en-US",
  title: "claudegrid",
  titleTemplate: ":title | claudegrid",
  description,
  base,
  cleanUrls: true,
  lastUpdated: true,
  sitemap: { hostname: siteUrl },
  head: [
    /** Cloudflare Web Analytics, one token for every page on projects.halit.org. */
    ["script", { defer: "", src: "https://static.cloudflareinsights.com/beacon.min.js", "data-cf-beacon": '{"token": "dd7e54d3f48841c187d72d9dbb92a6b6"}' }],
    ["meta", { name: "keywords", content: "claude code, claude, anthropic, ai coding agent, multi agent, claude code parallel agents, multiple claude code agents, claude code tmux, git worktree, tmux, konsole, iterm2, kitty, wezterm, macos, linux, split terminal, cli" }],
    ["meta", { name: "author", content: "Halit Sever" }],
    ["link", { rel: "preconnect", href: "https://fonts.googleapis.com" }],
    ["link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" }],
    ["link", { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Space+Grotesk:wght@500;700&display=swap" }],
    ["link", { rel: "icon", type: "image/svg+xml", href: base + "logo.svg" }],
    ["link", { rel: "apple-touch-icon", href: base + "logo-180.png" }],
    ["meta", { name: "theme-color", content: "#e8573c" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "claudegrid" }],
    ["meta", { property: "og:image", content: siteUrl + "og.png" }],
    ["meta", { property: "og:image:width", content: "1200" }],
    ["meta", { property: "og:image:height", content: "630" }],
    ["meta", { name: "twitter:image", content: siteUrl + "og.png" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
  ],
  /** Per-page canonical and Open Graph tags, so search engines and link previews get the right URL. */
  transformPageData(pageData) {
    const path = pageData.relativePath.replace(/(^|\/)index\.md$/, "$1").replace(/\.md$/, "");
    const url = siteUrl + path;
    const title = pageData.frontmatter.title ?? pageData.title ?? "claudegrid";
    const desc = pageData.frontmatter.description ?? pageData.description ?? description;
    const graph: Record<string, unknown>[] = [];
    if (path.startsWith("blog/") && path !== "blog/") {
      graph.push(
        {
          "@type": "BlogPosting",
          headline: title,
          description: desc,
          url,
          mainEntityOfPage: url,
          image: siteUrl + "og.png",
          inLanguage: "en-US",
          datePublished: pageData.frontmatter.date,
          dateModified: pageData.lastUpdated ? new Date(pageData.lastUpdated).toISOString() : pageData.frontmatter.date,
          author,
          publisher: author,
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "claudegrid", item: siteUrl },
            { "@type": "ListItem", position: 2, name: "Blog", item: siteUrl + "blog/" },
            { "@type": "ListItem", position: 3, name: title, item: url },
          ],
        },
      );
    } else if (path === "blog/") {
      graph.push({ "@type": "Blog", name: "claudegrid blog", description: desc, url, inLanguage: "en-US", author });
    } else if (path !== "") {
      graph.push({ "@type": "TechArticle", headline: title, description: desc, url, inLanguage: "en-US", author, ...(pageData.lastUpdated ? { dateModified: new Date(pageData.lastUpdated).toISOString() } : {}) });
    }
    const faq = pageData.frontmatter.faq as { q: string; a: string }[] | undefined;
    if (faq?.length) {
      graph.push({ "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
    }
    pageData.frontmatter.head ??= [];
    if (graph.length) pageData.frontmatter.head.push(["script", { type: "application/ld+json" }, JSON.stringify({ "@context": "https://schema.org", "@graph": graph })]);
    pageData.frontmatter.head.push(
      ["link", { rel: "canonical", href: url }],
      ["meta", { property: "og:url", content: url }],
      ["meta", { property: "og:title", content: title }],
      ["meta", { property: "og:description", content: desc }],
    );
    if (path === "") {
      const license = "https://opensource.org/licenses/MIT";
      const author = { "@type": "Person", name: "Halit Sever", url: "https://github.com/halitsever" };
      const app = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "SoftwareSourceCode",
            "@id": `${siteUrl}#source`,
            name: "claudegrid",
            description,
            url: siteUrl,
            codeRepository: "https://github.com/halitsever/claudegrid",
            programmingLanguage: "TypeScript",
            license,
            author,
          },
        ],
      };
      pageData.frontmatter.head.push(["script", { type: "application/ld+json" }, JSON.stringify(app)]);
    }
  },
  themeConfig: {
    logo: { src: "/logo.svg", alt: "claudegrid logo" },
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "App", link: "/guide/app" },
      { text: "Config", link: "/guide/configuration" },
      { text: "CLI", link: "/guide/cli" },
      { text: "Blog", link: "/blog/" },
      { text: "GitHub", link: "https://github.com/halitsever/claudegrid" },
    ],
    sidebar: {
      "/blog/": [
        { text: "Blog", items: [{ text: "All posts", link: "/blog/" }, ...BLOG.map(([slug, text]) => ({ text, link: `/blog/${slug}` }))] },
        {
          text: "claudegrid",
          items: [
            { text: "Claude Code worktrees", link: "/claude-code-worktree" },
            { text: "Claude Code in tmux", link: "/guide/tmux" },
            { text: "Getting started", link: "/guide/getting-started" },
          ],
        },
      ],
      "/": [
      {
        text: "Introduction",
        items: [
          { text: "Getting started", link: "/guide/getting-started" },
          { text: "Usage", link: "/guide/usage" },
          { text: "Desktop app", link: "/guide/app" },
        ],
      },
      {
        text: "Guide",
        items: [
          { text: "Configuration", link: "/guide/configuration" },
          { text: "Presets", link: "/guide/presets" },
          { text: "Claude Code worktrees", link: "/claude-code-worktree" },
          { text: "The --worktrees option", link: "/guide/worktrees" },
          { text: "Terminals", link: "/guide/terminals" },
          { text: "Claude Code in tmux", link: "/guide/tmux" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "CLI", link: "/guide/cli" },
          { text: "Troubleshooting", link: "/guide/troubleshooting" },
          { text: "Changelog", link: "https://github.com/halitsever/claudegrid/blob/main/CHANGELOG.md" },
        ],
      },
      ],
    },
    socialLinks: [{ icon: "github", link: "https://github.com/halitsever/claudegrid" }],
    editLink: { pattern: "https://github.com/halitsever/claudegrid/edit/main/docs/:path" },
    search: { provider: "local" },
    footer: { message: "Released under the MIT License.", copyright: "Copyright © 2026 Halit Sever" },
  },
});
