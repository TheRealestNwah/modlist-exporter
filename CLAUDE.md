# Modlist Exporter

A single self-contained web page (`index.html`: markup, CSS and JS in one file, no build step, no dependencies) that turns Vortex and Mod Organizer 2 mod lists into shareable text, CSV, Markdown and BBCode. The live demo is served by GitHub Pages.

## Build, test, lint

```bash
node --test test/*.test.js        # all tests; CI runs this on Node 22
python3 -m http.server 8000       # serve locally (or just open index.html)
```

There is no lint step and no install step.

## Layout

- `index.html` — the whole tool. Keep it one file.
- `test/extract.js` — lifts the pure (DOM-free) functions out of `index.html` and evals them for tests. `test/modlist.test.js`, `test/smoke.test.js` and `test/browser.js` are the suites and helpers.
- `.github/workflows/` — `test.yml` (PRs), `deploy.yml` (GitHub Pages, on release), `release.yml` (manual "Cut release": tests, tags, releases, then calls deploy).
- `docs/` — README screenshots, social image, deploy notes. Not loaded by the tool.

## Gotchas

- `extract.js` finds functions by shape: each must be declared at two-space indentation inside the IIFE and closed by a two-space `}`. If the file stops following that, extraction throws by name.
- `NAMES` in `extract.js` is maintained by hand. A newly extracted helper missing from it used to cause a wall of `ReferenceError`s; the guard now names the missing function. Add new pure helpers there.
- There are two `<script>` blocks (a head one that applies the theme before first paint, and the main one). The harness picks the block that defines `parseModlist()`, not by position.
- Releases are cut from the Actions tab (workflow dispatch), not by pushing tags. The built `.html` release asset is the deliverable.
