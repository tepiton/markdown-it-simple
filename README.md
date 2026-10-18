# markdown-it-simple

A mimeo template that turns a folder of Markdown files into a static site.
One build script, three dependencies ([markdown-it], [markdown-it-anchor],
[gray-matter]), no static site generator. Pushing to `main` builds the
site and deploys it to GitHub Pages.

[markdown-it]: https://github.com/markdown-it/markdown-it
[markdown-it-anchor]: https://github.com/valeriangalliat/markdown-it-anchor
[gray-matter]: https://github.com/jonschlinkert/gray-matter

## Quick start

```bash
npm ci
npm run build
```

The build writes HTML to `_site/`. To preview it, serve that directory
with any static server, for example:

```bash
npx serve _site
```

## Layout

| Path | Purpose |
|------|---------|
| `public/` | The site root. Markdown becomes HTML; every other file is copied as is. |
| `public/assets/style.css` | The stylesheet every page links to |
| `scripts/build.mjs` | The build script |
| `.github/workflows/pages.yml` | Builds and deploys to GitHub Pages on push to `main` |

## How the build works

`public/` is the site root: whatever is in it ends up on the site at the
same path. The build deletes and recreates `_site/`, then, for each file
under `public/`:

1. Copies non-Markdown files (the stylesheet, images, PDFs, and so on) to
   the same path under `_site/`.
2. For `.md` and `.markdown` files:
   - reads the front matter with gray-matter
   - fills in `{{key}}` placeholders (see [Substitution](#substitution))
   - renders the Markdown with markdown-it
   - wraps the result in an HTML page that links the stylesheet

The directory structure is preserved, so `public/hughie/index.md` becomes
`_site/hughie/index.html`, served at `/hughie/`, and
`public/pics/duck.jpg` becomes `_site/pics/duck.jpg`.

The build also writes an empty `_site/.nojekyll`. The Pages workflow
doesn't need it, but it stops GitHub Pages from running Jekyll if
`_site/` is ever deployed from a branch instead.

### Details

- `README.md` in any directory becomes `index.html`.
- Relative links to Markdown files are rewritten to point at the HTML:
  `[Dewey](../dewey/index.md)` links to `../dewey/index.html`.
- Headings get GitHub-style `id` slugs, so `## First Section` can be
  linked as `#first-section`.
- A page with two or more `##` or `###` headings gets a table of contents
  at the top.
- Raw HTML in Markdown is passed through, and bare URLs are turned into links.
- If `public/` has no root `index.md` or `README.md`, the build generates
  an index page that lists every page.

## Front matter

Front matter is optional YAML at the top of a page:

```yaml
---
title: "The Duckburg Gazette"
subtitle: "a mimeo template"
author: "the Junior Woodchucks"
date: 2026-10-18
description: "Shown in search results and link previews"
lang: en
---
```

| Key | Used for |
|-----|----------|
| `title` | Page header and `<title>`. Without it, the first `#` heading is used, then the file name. The header block is only shown when `title` is set. |
| `subtitle` | Line under the title in the header |
| `author` | Line in the header |
| `date` | Line in the header, shown as `YYYY-MM-DD` |
| `description` | `<meta name="description">` |
| `lang` | `<html lang>`; defaults to `en` |

You can add any other keys. The page header ignores them, but they are
available for substitution.

## Substitution

Pages can use front-matter values in their body with `{{key}}`. This is
plain text replacement, not a template language: there are no loops,
conditionals, or partials.

```markdown
---
author: "Huey, Dewey, and Louie"
date: 2026-10-18
troop:
  number: 1
  town: Duckburg
---

Compiled on {{date}} by {{author}}, Troop {{troop.number}}, {{ troop.town }}.
```

renders as:

> Compiled on 2026-10-18 by Huey, Dewey, and Louie, Troop 1, Duckburg.

### Rules

| Placeholder | Result |
|-------------|--------|
| `{{author}}` | The value of `author` |
| `{{ author }}` | The same; spaces inside the braces are allowed |
| `{{troop.number}}` | A nested value, looked up with dots |
| `{{date}}` | YAML dates are printed as `YYYY-MM-DD` |
| `{{missing}}` | Left as is, and the build prints a warning naming the file |
| `\{{author}}` | The literal text `{{author}}` |

Things to know:

- **Substitution runs before Markdown rendering.** Values are treated as
  Markdown, so `author: "*Huey*"` comes out italic, and a value can be
  used inside a link: `[repo]({{repo}})`.
- **It also replaces placeholders inside code blocks and inline code.**
  To show the syntax itself, as in documentation about this feature,
  escape it with a backslash: `\{{author}}`.
- Key names may contain letters, digits, underscores, and dots.
- Each page only sees its own front matter. There are no site-wide
  variables.
- Values that are lists print comma-separated (`a,b,c`).

## Configuration

The build script reads these environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `SRC_DIR` | `public` | Content directory |
| `OUT_DIR` | `_site` | Output directory; it is deleted and recreated on every build |
| `SITE_TITLE` | `Documentation` | Prefix for every page's `<title>`. The Pages workflow sets it to the repository name. |
| `CSS_SRC` | unset | A stylesheet to use instead of `assets/style.css` in `SRC_DIR` |

```bash
SITE_TITLE="Duckburg Gazette" npm run build
```

`CSS_SRC` is for building some other folder of Markdown with this
template's theme:

```bash
SRC_DIR=docs CSS_SRC=public/assets/style.css npm run build
```

## Styling

`public/assets/style.css` sets up a single readable column with light and
dark themes that follow the system setting. Colors are CSS custom
properties on `:root` (`--fg`, `--bg`, `--muted`, `--accent`, `--border`,
`--code-bg`), so changing the palette means editing those values in both
blocks.

Every page links `assets/style.css` relative to the site root; the path
is fixed in the build script. If that file is missing (and `CSS_SRC` isn't
set), the build prints a warning and the pages come out unstyled.

## Deploying

The workflow in `.github/workflows/pages.yml` runs on pushes to `main`
that change `public/`, `scripts/`, `package.json`, `package-lock.json`, or
the workflow itself. It can also be started by hand from the Actions tab.

To enable it on a new repository made from this template, go to
**Settings > Pages** and set **Source** to **GitHub Actions**.

`package-lock.json` is committed because the workflow installs with
`npm ci`.
