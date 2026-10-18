#!/usr/bin/env node
// Recursively convert Markdown in SRC_DIR to styled HTML in OUT_DIR with
// markdown-it, preserving subdirectory structure and copying other assets.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import matter from "gray-matter";

const SRC_DIR = path.resolve(process.env.SRC_DIR ?? "public");
const OUT_DIR = path.resolve(process.env.OUT_DIR ?? "_site");
const SITE_TITLE = process.env.SITE_TITLE ?? "Documentation";
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CSS_SRC = process.env.CSS_SRC ?? path.join(SCRIPT_DIR, "style.css");
const MD_EXT = /\.(md|markdown)$/i;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// GitHub-style heading slugs.
const slugify = (s) =>
  s.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s+/g, "-");

// Output name for a Markdown file: foo.md -> foo.html, README.md -> index.html.
const htmlName = (file) => {
  const base = file.replace(MD_EXT, "");
  return (base.toLowerCase() === "readme" ? "index" : base) + ".html";
};

const md = new MarkdownIt({ html: true, linkify: true });
md.use(anchor, {
  slugify,
  // Collect headings per render for the table of contents.
  callback: (token, { slug, title }) => {
    md._headings?.push({ level: Number(token.tag.slice(1)), slug, title });
  },
});

// Rewrite relative links to .md files so they point at the generated .html.
const defaultLinkOpen =
  md.renderer.rules.link_open ?? ((t, i, o, e, self) => self.renderToken(t, i, o));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const href = tokens[idx].attrGet("href");
  if (href && !/^([a-z][\w+.-]*:|\/\/|#)/i.test(href)) {
    const [, p, frag = ""] = href.match(/^([^#?]*)(.*)$/);
    if (MD_EXT.test(p)) {
      const dir = p.includes("/") ? p.slice(0, p.lastIndexOf("/") + 1) : "";
      tokens[idx].attrSet("href", dir + htmlName(p.slice(dir.length)) + frag);
    }
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

function renderToc(headings) {
  const items = headings.filter((h) => h.level >= 2 && h.level <= 3);
  if (items.length < 2) return "";
  const lis = items
    .map((h) => `<li class="toc-h${h.level}"><a href="#${h.slug}">${escapeHtml(h.title)}</a></li>`)
    .join("\n");
  return `<nav id="TOC" role="doc-toc">\n<ul>\n${lis}\n</ul>\n</nav>\n`;
}

function page({ title, fm, body, toc, root }) {
  const header = fm.title
    ? `<header id="title-block-header">
<h1 class="title">${escapeHtml(fm.title)}</h1>
${fm.subtitle ? `<p class="subtitle">${escapeHtml(fm.subtitle)}</p>\n` : ""}${fm.author ? `<p class="author">${escapeHtml(fm.author)}</p>\n` : ""}${fm.date ? `<p class="date">${escapeHtml(fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : fm.date)}</p>\n` : ""}</header>\n`
    : "";
  return `<!DOCTYPE html>
<html lang="${escapeHtml(fm.lang ?? "en")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(`${SITE_TITLE} – ${title}`)}</title>
${fm.description ? `<meta name="description" content="${escapeHtml(fm.description)}">\n` : ""}<link rel="stylesheet" href="${root}/assets/style.css">
</head>
<body>
${header}${toc}${body}</body>
</html>
`;
}

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

async function main() {
  await fs.access(SRC_DIR).catch(() => {
    console.error(`Source directory '${SRC_DIR}' not found`);
    process.exit(1);
  });
  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(path.join(OUT_DIR, "assets"), { recursive: true });
  await fs.copyFile(CSS_SRC, path.join(OUT_DIR, "assets", "style.css"));
  await fs.writeFile(path.join(OUT_DIR, ".nojekyll"), "");

  const files = [];
  for await (const f of walk(SRC_DIR)) files.push(f);
  files.sort();

  let count = 0;
  for (const src of files) {
    const rel = path.relative(SRC_DIR, src);
    const relDir = path.dirname(rel);

    if (!MD_EXT.test(rel)) {
      const dest = path.join(OUT_DIR, rel);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(src, dest);
      continue;
    }

    const { data: fm, content } = matter(await fs.readFile(src, "utf8"));
    md._headings = [];
    const body = md.render(content);
    const headings = md._headings;
    const h1 = headings.find((h) => h.level === 1);
    const title = fm.title ?? h1?.title ?? path.basename(rel).replace(MD_EXT, "");
    const root = relDir === "." ? "." : relDir.split(path.sep).map(() => "..").join("/");

    const outRel = path.join(relDir, htmlName(path.basename(rel)));
    const dest = path.join(OUT_DIR, outRel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, page({ title, fm, body, toc: renderToc(headings), root }));
    console.log(`  ${rel} -> ${outRel}`);
    count++;
  }

  // Ensure a root index exists.
  const indexPath = path.join(OUT_DIR, "index.html");
  if (!(await fs.stat(indexPath).catch(() => null))) {
    console.log("No index.md/README.md at root; generating page list.");
    const pages = [];
    for await (const f of walk(OUT_DIR)) if (f.endsWith(".html")) pages.push(path.relative(OUT_DIR, f).split(path.sep).join("/"));
    const list = pages.sort().map((p) => `<li><a href="${p}">${escapeHtml(p)}</a></li>`).join("\n");
    await fs.writeFile(indexPath, page({ title: SITE_TITLE, fm: {}, body: `<h1>${escapeHtml(SITE_TITLE)}</h1>\n<ul>\n${list}\n</ul>\n`, toc: "", root: "." }));
  }

  console.log(`Built ${count} page(s) into ${path.relative(process.cwd(), OUT_DIR) || OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
