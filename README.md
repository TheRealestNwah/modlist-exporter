# Modlist Exporter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Browse and export your installed mods from your mod manager. Currently
supports Vortex, with more mod managers planned. Runs entirely in your
browser, with exports available as CSV, plain text, or clipboard copy.

**[Live demo](https://therealestnwah.github.io/modlist-exporter/)

<!-- Add a screenshot or short GIF here once you have one, e.g.:
![screenshot](docs/screenshot.png)
-->

## Features

- Drag-and-drop (or click-to-browse) file loading — nothing ever leaves your
  browser, no server involved
- Auto-detects games and profiles from the state file
- Enabled/disabled status per profile, version, and Nexus source link where
  available
- **File freshness check** — flags when the loaded backup is more than a
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

## How it works

- User selects/drops a Vortex state JSON file (see "Notes on Vortex's file
  locations" below).
- The file is parsed entirely in-browser (`FileReader` + `JSON.parse`) —
  nothing is ever uploaded anywhere.
- It looks for `persistent.mods[gameId][modId]` (falls back to an unwrapped
  root if `persistent` isn't present, since some backup files are stored
  unwrapped).
- It cross-references `persistent.profiles[profileId].modState` to determine
  enabled/disabled status per profile.
- The browser's `File.lastModified` timestamp is checked against the current
  time to warn if the snapshot looks stale.
- Results render into a sortable table with CSV / .txt / clipboard export.

## Notes on Vortex's file locations (learned while building this)

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

## Roadmap / ideas

- [x] Warn when the loaded file looks stale
- [ ] Support Mod Organizer 2's modlist export format alongside Vortex's JSON
- [ ] Surface load order when present in the state file (game-extension
      dependent)
- [ ] Diff view between two loaded snapshots (what was added/removed/updated)
- [ ] Folder-watch / auto-refresh via the File System Access API

## Contributing

Issues and PRs welcome. Since this is a single HTML file, most changes can be
tested by just opening `index.html` in a browser after editing.

## License

MIT — see [LICENSE](LICENSE).
