import { defineConfig } from "vitepress";

const hostname = "https://halitsever.github.io";
const base = "/claudegrid/";
const siteUrl = hostname + base;
const description = "Run 4 Claude Code AI agents side by side. One command opens a KDE Konsole window split 2x2 with claude in every pane.";

export default defineConfig({
  lang: "en-US",
  title: "claudegrid",
  titleTemplate: ":title | claudegrid",
  description,
  base,
  cleanUrls: true,
  lastUpdated: true,
  sitemap: { hostname: siteUrl },
  head: [
    ["meta", { name: "keywords", content: "claude code, claude, anthropic, ai coding agent, multi agent, konsole, kde, split terminal, tiling terminal, linux cli" }],
    ["meta", { name: "author", content: "Halit Sever" }],
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
    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push(
      ["link", { rel: "canonical", href: url }],
      ["meta", { property: "og:url", content: url }],
      ["meta", { property: "og:title", content: title }],
      ["meta", { property: "og:description", content: desc }],
    );
  },
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "GitHub", link: "https://github.com/halitsever/claudegrid" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting started", link: "/guide/getting-started" },
          { text: "Usage", link: "/guide/usage" },
          { text: "How it works", link: "/guide/how-it-works" },
          { text: "Troubleshooting", link: "/guide/troubleshooting" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/halitsever/claudegrid" }],
    editLink: { pattern: "https://github.com/halitsever/claudegrid/edit/main/docs/:path" },
    search: { provider: "local" },
    footer: { message: "Released under the MIT License.", copyright: "Copyright © 2026 Halit Sever" },
  },
});
