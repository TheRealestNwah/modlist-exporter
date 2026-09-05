# Modlist Exporter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Browse and export your installed mods from your mod manager. Supports Vortex
and Mod Organizer 2, with more mod managers planned. Runs entirely in your
browser, with exports available as CSV, plain text, or clipboard copy.

**[Live demo](https://therealestnwah.github.io/modlist-exporter/)**

<!-- Add a screenshot or short GIF here once you have one, e.g.:
![screenshot](docs/screenshot.png)
-->

## Features

- Drag-and-drop (or click-to-browse) file loading — nothing ever leaves your
  browser, no server involved
- **Supports two mod managers:**
  - **Vortex** — auto-detects games and profiles from the state file; shows
    version, enabled/disabled status per profile, and a Nexus source link
    where available
  - **Mod Organizer 2** — reads `modlist.txt` directly; shows mod name,
    enabled/disabled status, and the mod's position in MO2's priority pane,
    with an optional sort by that order (MO2's format doesn't store version
    or source data)
- **File freshness check** — flags when the loaded file is more than a
  couple days old, so you don't export a stale list without realizing it
- Export as CSV, plain `.txt`, or copy straight to clipboard

## Structure

This is a single self-contained file — no build step, no dependencies to
install.

- `index.html` — everything (markup, CSS, JS) lives in this one file.

## Running it

Just double-click `index.html`, or serve it locally:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Releasing

`main` holds finished work that hasn't shipped yet — pushing to it does not
change the live site. The GitHub Pages deploy runs only when a release is
**published** on GitHub, and it deploys the commit that release's tag points
at.

So the flow is: merge to `main` freely, then publish a release when you want
those changes live. Pushing a bare tag isn't enough — the release itself has
to be published. There's a manual "Run workflow" button on the Actions tab if
you ever need to redeploy without cutting a release.

## How it works

The tool detects the format automatically based on file content, not
extension:

- **If the file parses as JSON**, it's treated as a Vortex state file. It
  looks for `persistent.mods[gameId][modId]` (falls back to an unwrapped
  root if `persistent` isn't present, since some backup files are stored
  unwrapped), and cross-references `persistent.profiles[profileId].modState`
  to determine enabled/disabled status per profile.
- **If it isn't valid JSON**, it's parsed as an MO2 `modlist.txt` — each
  line's leading marker determines status (`+` enabled, `-` disabled, `*`
  unmanaged base-game/DLC content), and the rest of the line is the mod
  name. Comment lines (`#`) and blanks are skipped, and MO2's
  `*_separator` entries are dropped so they don't pollute the list or the
  count. Each entry's file position is recorded and then reversed to
  recover MO2's pane order — see "Priority order in modlist.txt" below.

In both cases:
- Nothing is ever uploaded anywhere — parsing happens with `FileReader` +
  `JSON.parse` entirely in-browser.
- The browser's `File.lastModified` timestamp is checked against the current
  time to warn if the snapshot looks stale.
- Results render into a sortable table with CSV / .txt / clipboard export.
- Mod names come from mod authors, so they're treated as untrusted: table
  cells are built as DOM text nodes rather than HTML, Nexus links are only
  constructed when the game and mod IDs actually look like IDs, and CSV
  fields that begin with `=`, `+`, `-` or `@` are quote-prefixed so
  spreadsheet apps don't evaluate them as formulas.

## Notes on file locations

### Vortex

Vortex has no built-in "export modlist" feature. Its mod/profile state is
written as periodic JSON snapshots under:

```
%AppData%\Vortex\temp\state_backups_full\
```

Files you may find there, in rough order of freshness:

- `manual.json` — only created when the user explicitly triggers a backup via
  **Settings → Workarounds → Backup** in Vortex. This is the most reliable
  way to get a fresh snapshot on demand.
- `startup.json` — rewritten each time Vortex launches.
- `hourly.json` — rewritten roughly once per hour while Vortex is running.

A `startup.json` also exists directly under `%AppData%\Vortex\` (not inside
`temp\state_backups_full`) — that one is a smaller session/window-settings
file and does **not** contain mod data. Easy to grab by mistake.

**Known issue:** on at least one real install, the automatic backup scheduler
silently stopped updating `startup.json`/`hourly.json` (both sat stale for
weeks despite mods being installed/removed in that time), with no obvious
error surfaced to the user. No root cause was confirmed. The manual backup
button was a reliable workaround — this is exactly what the freshness
warning in the tool now helps catch early.

### Mod Organizer 2

MO2 keeps a plain-text modlist per profile at:

```
<MO2 install folder>\profiles\<profile name>\modlist.txt
```

Unlike Vortex, this file updates live as mods are installed, enabled, or
disabled — there's no periodic-backup staleness concern here. It only
records mod name and enabled state; version numbers and source links aren't
part of this format, so those columns will show as empty for MO2 files.

Exports are named after the detected format (`vortex-modlist.csv` /
`mo2-modlist.csv`, and likewise for `.txt`).

#### Priority order in modlist.txt

`modlist.txt` is written in **reverse** of the order MO2 shows in its left
pane. The first line of the file is the *bottom* of the pane, and the last
line is the top. Because mods lower in MO2's pane win file conflicts, that
means **line 1 is the highest priority and the last line is priority 0** —
the opposite of the intuitive reading.

This was verified against a real profile on 2026-09-05 rather than assumed.
Two things confirmed it: `ModOrganizer.ini` records the pane's display order
in `MainWindow_modList_index`, ending with the `Overwrite` entry that MO2
always pins to the bottom of the pane, and that order is the exact reverse
of the file. The pane's top row was then checked directly in MO2.

The `#` column and the "MO2 priority order" sort both reverse the file to
match what you see in MO2, numbering from 1 at the top of the pane.
Separators occupy a slot in that ordering (as they do in MO2) but are not
themselves listed. The column is hidden for Vortex files, which carry no
comparable ordering.

## Roadmap / ideas

- [x] Warn when the loaded file looks stale
- [x] Support Mod Organizer 2's modlist export format alongside Vortex's JSON
- [x] Surface MO2's priority order (verified: the file is stored reversed
      relative to MO2's pane)
- [ ] Surface Vortex load order when present in the state file
      (game-extension dependent)
- [ ] Diff view between two loaded snapshots (what was added/removed/updated)
- [ ] Folder-watch / auto-refresh via the File System Access API

## AI disclosure

This project's code, documentation, and repo setup (including the GitHub
Actions workflow) were built in collaboration with Claude (Anthropic), used
conversationally to write and iterate on the implementation, debug the
GitHub Pages deployment, and draft this README. Testing, real-world Vortex
file troubleshooting, and all direction on features and scope were done by
the project owner.

## Contributing

Issues and PRs welcome. Since this is a single HTML file, most changes can be
tested by just opening `index.html` in a browser after editing.

## License

MIT — see [LICENSE](LICENSE).
