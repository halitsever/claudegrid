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
    ["meta", { name: "theme-color", content: "#d97757" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "claudegrid" }],
    ["meta", { property: "og:image", content: "https://i.ibb.co/NrPh9xP/image.png" }],
    ["meta", { name: "twitter:card", content: "summary" }],
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
    logo: "https://i.ibb.co/NrPh9xP/image.png",
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
