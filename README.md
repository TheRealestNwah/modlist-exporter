# Modlist Exporter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Browse and export your installed mods from your mod manager. Supports Vortex
and Mod Organizer 2. Runs entirely in your browser, with exports available as
CSV, plain text, Markdown, BBCode, or clipboard copy.

**[Live demo](https://therealestnwah.github.io/modlist-exporter/)**

![The mod list view in the Vortex theme: a Skyrim Special Edition profile showing the theme picker, search and sort controls, per-mod install sizes with a disk total, collection membership, endorsement status, enabled/disabled state, and Nexus links](docs/screenshot.png)

<sub>Example data — not a real load order.</sub>

## Features

- Drag-and-drop (or click-to-browse) file loading — nothing ever leaves your
  browser, no server involved
- **Supports two mod managers:**
  - **Vortex** — auto-detects games and profiles from the state file; shows
    version, enabled/disabled status per profile, and a Nexus source link
    where available. Installed Nexus **collections** are labelled as such and
    link to the collection page, instead of appearing as ordinary mods with
    nothing to click
  - **Mod Organizer 2** — reads `modlist.txt` directly; shows mod name,
    enabled/disabled status, and the mod's position in MO2's priority pane,
    with an optional sort by that order (MO2's format doesn't store version
    or source data)
- **Collection membership** — shows which installed mods came from which
  Nexus collection, whether the collection required or merely recommended
  them, and which of a collection's mods you don't have installed
- **Endorsement status** — see at a glance which mods you've endorsed on
  Nexus, with a filter for the ones you haven't got round to
- **Search and sort** — filter the list by name, mod ID, version or source;
  sort by name, install size, install date, or MO2 priority order
- **Install date** — when Vortex installed each mod, with a "recently
  installed" sort, so "what did I add last week" doesn't need two snapshots
- **Same Nexus page** — one mod page often ships a main file plus optional
  patches, each installing as its own mod. Mods sharing a page say so, rather
  than looking like the same link repeated
- **Install size** — per-mod size and a total for whatever is currently shown,
  so you can see what's actually using the disk (Vortex only; MO2's
  `modlist.txt` records no sizes)
- **File freshness check** — flags when the loaded file is more than a
  couple days old, so you don't export a stale list without realizing it
- **Load order** — a Vortex game's plugin load order as its own list, in the
  numbered form people are asked to post when something breaks. Exports as
  plain text, Markdown, BBCode or CSV
- **Compare two snapshots** — load a second file to see what changed between
  them: added, removed, enabled/disabled, version bumps, and priority moves
- Export as CSV, plain `.txt`, or copy straight to clipboard (the changes
  view exports too, as `*-changes.csv` / `*-changes.txt`)
- **Markdown and BBCode** — a format picker next to the export buttons, for
  posting a load order on a forum, a wiki, or in a repo
- **Seven themes** — Midnight, Vortex, NMM, Liquid Glass, UESP, and a
  Fallout 3 / New Vegas terminal pair, picked in the header and remembered
  per browser
- **Bulk CSV** — several Vortex games in one sheet with a `Game` column, for
  when you want the whole setup rather than one game at a time; tick the games
  you want, or leave them all ticked for everything

## Structure

This is a single self-contained file — no build step, no dependencies to
install.

- `index.html` — everything (markup, CSS, JS) lives in this one file.
- `test/` — tests. Development only; nothing here is needed to use the tool.
- `docs/` — the README screenshot, the social preview image, and a note on
  deploying. None of it is loaded by the tool; `og.png` is only ever fetched
  by a crawler when someone shares the link.

## Browser support

Any current browser. There is no build step, no framework, and nothing that
depends on a particular engine — the tool reads a file you choose and renders a
table. It works offline and from a local file, and it makes no network requests
at all.

## Running it

Use the [live demo](https://therealestnwah.github.io/modlist-exporter/), or
download `modlist-exporter-<version>.html` from the
[latest release](https://github.com/TheRealestNwah/modlist-exporter/releases/latest)
and double-click it. That one file is the whole tool — there is nothing to
install, nothing to unzip, and it works with no internet connection.

(The "Source code" archives GitHub attaches to every release are the whole
repository, tests and workflows included. The `.html` asset is the thing you
actually want.)

From a clone, double-click `index.html`, or serve it locally:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Tests

```bash
node --test test/*.test.js
```

No dependencies and no build step — not for the unit tests, and not for the
browser ones either. Because `index.html` is deliberately one
self-contained file with nothing to import, `test/extract.js` lifts the pure
(DOM-free) functions out of it and evaluates them. There are two script
elements — a small one in the head that applies the stored theme before first
paint, and the main one at the end — so the harness picks the block by looking
for the one that defines `parseModlist()` rather than by position. The
functions it lifts:
`parseMO2`, `parseModlist`, `buildRows`, `viewState`, `diffRows`,
`indexModsForMatching`, `matchRule`, `collectionMembership`,
`collectionLabel`, `missingCollectionMembers`, `endorsementLabel`,
`isUnendorsed`, `columnsIn`, `csvStatus`, `defaultProfileFor`,
`gamesWithMods`, `allGamesRows`,
`allGamesFileName`,
`formatSize`, `matchesQuery`, `statusLabel`, `csvCell`, `diffDetail`,
`mdCell`, `bbSafe`, `safeHttpUrl`, `mdLink`, `bbLink`, `markdownLines`,
`bbcodeLines`, `markdownDiffLines`, `bbcodeDiffLines`, `installedAt`,
`installedLabel`, `nexusPageCounts`, `loadOrderFor`, `gamesWithLoadOrder`,
`loadOrderNote`, `themeIds`, `resolveTheme` and `themeMeta`.

That list is maintained by hand, and forgetting to add a newly extracted
helper to it broke the suite three separate times — each time as a wall of
`ReferenceError`s across dozens of tests, saying nothing about the cause.

`extract.js` now checks for that before evaluating anything: if the extracted
code calls a function `index.html` declares at the top level of its IIFE, and
that function isn't in the list, extraction stops with one message naming it.
Comments are stripped first, so a function mentioned in prose doesn't count as
a call.

That couples the tests to the file's shape — each of those must stay declared
at two-space indentation inside the IIFE. If one is renamed or re-indented,
extraction fails loudly by name rather than silently testing nothing.

The suite covers marker parsing, separator handling, MO2's reversed priority
order, the Vortex attribute fallbacks, Nexus mod and collection link
construction (including rejecting a malformed slug), collection membership
matching and uninstalled-member detection, endorsement states, size
formatting and sorting, the all-games export's per-game profile selection,
the tri-state enabled/unknown status, every diff classification, the CSV
formula-injection guard, the Markdown and BBCode escaping, and the theme
resolution that decides what a stored preference means.

`render()` is deliberately split in two: `viewState()` decides *what* should
be shown — filtering, sorting, column visibility, totals — and `render()` does
nothing but draw the result. Every render-layer bug found so far has been a
decision bug rather than a drawing bug (a column-visibility check reading
stale state; a note firing for a format it didn't apply to), and neither
needed a browser to catch. Keeping the decisions DOM-free is what makes them
testable without adding a dependency or a build step to a single-file
project.

`columnsIn()` is the same idea applied across the outputs. Which optional
columns a row set carries — order, size, collection, endorsement — is a
decision the table, the CSV, the Markdown table and the BBCode list all have
to reach the same answer on. They each used to ask in their own words, which
is how a column ends up in an export that wasn't in the view it came from, so
they now share one answer and one test.

That leaves the wiring — whether a listener is attached, whether an element ID
is right, whether switching views leaves the previous one's furniture on
screen. Most of those fail loudly on first load, but not all: loading a new
file while the changes view was open reset `view` and none of the chrome that
goes with it, so the summary bar read "4 changes" over a mod list. Nothing
threw, nothing looked broken unless you had taken that exact path, and it
shipped across several releases before anyone noticed.

`test/smoke.test.js` covers that ground now. It drives a real browser: loads
`index.html`, pushes a file through the actual `<input>`, clicks the actual
tabs and buttons, and asserts on what the page ends up showing — including
that switching views leaves nothing behind, which is the bug above.

It needs no packages either. Node's built-in `WebSocket` plus the Chrome
DevTools Protocol is enough to open a page, evaluate an expression in it and
read the value back, so it drives whichever Chrome, Chromium or Edge is
already on the machine. A suite that required a browser download to verify a
tool with nothing to install would be an odd way to keep that promise.

Locally the smoke tests skip when no browser is found, so the suite still runs
on a bare machine; point `CHROME_PATH` at one to run them. In CI
`SMOKE_REQUIRED=1` turns that skip into a failure, because a green run that
silently tested none of the wiring is worse than not having the tests.

One test is skipped unless you have local Vortex backups: if
`%APPDATA%\Vortex\temp\state_backups_full\` holds two or more state files, it
parses and diffs them as a real-world check. Nothing from those files is
committed.

Tests run in CI on every pull request into `main`.

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
- Results render into a table with CSV / .txt / clipboard export, where the
  copy and text-download buttons render as plain text, Markdown or BBCode.
  Sorting is by name, install size, or — for MO2 files only — priority
  order. Every
  column and sort option hides itself where the format carries no such data:
  MO2 files have no sizes, collections or endorsement state, and Vortex files
  have no equivalent of MO2's priority order.
- Sizes come from Vortex's `modSize` (falling back to `fileSize`), in bytes.
  The CSV export includes both the formatted size and the raw byte count, so
  it stays sortable in a spreadsheet.
- The search box filters on name, mod ID, version, source and collection
  name — so searching a collection finds its members. Multiple terms all have
  to match, in any order.
- Mod names come from mod authors, so they're treated as untrusted: table
  cells are built as DOM text nodes rather than HTML, Nexus links are only
  constructed when the game and mod IDs actually look like IDs, and CSV
  fields that begin with `=`, `+`, `-` or `@` are quote-prefixed so
  spreadsheet apps don't evaluate them as formulas. The Markdown export
  escapes the characters that would end a table cell or open a link, and
  entity-escapes `<` since Markdown passes raw HTML to the renderer. BBCode
  has no escape its forum software agrees on, so square brackets in a name
  are swapped for parentheses — lossy, but it can't open a tag.

## Collection membership, and why it's a guess

This is the one place the tool infers rather than reports, so it's worth
being explicit about.

A Nexus collection installs as a mod that carries its members in a `rules`
array. But those rules reference members by `fileMD5`, `logicalFileName` or
`description` — **not** by the installed mod's ID. So membership has to be
matched rather than looked up. The matcher tries the most precise key first:

1. `fileMD5` — exact
2. `logicalFileName`
3. `description`, against a mod's name

Against the 436 real mods and 52 collection rules this was developed with,
**49 of 52 (94%)** resolved. A rule that matches nothing simply means that
member isn't installed, which is entirely normal for a `recommends` you
declined — it isn't an error and nothing is reported for it.

Mods a collection lists that you don't have installed are reported in a note
below the table, rather than being dropped silently. That is what the
unmatched rules mean — often a recommendation you declined — and it's more
useful shown than hidden.

Practical consequences: a mod is only attributed if it's actually installed,
attribution can in principle be wrong if two different mods share a name and
neither has a usable md5, and a mod belonging to two collections lists both.
Collections are never listed as members of themselves. Membership is
deliberately **not** compared in the changes view — a mod's collection rarely
changes, and matching noise there would be worse than the signal.

## Themes

Seven, picked from the header and remembered in `localStorage` per browser:

- **Midnight** — the default. Dark, violet accent.
- **Vortex** — near-black with amber calls to action, in the spirit of the
  app's own dark UI.
- **NMM** — Nexus Mod Manager, the desktop app most Skyrim modders used
  before Vortex existed. It was a plain .NET WinForms utility rather than a
  branded app, so this is light grey chrome, a white grid with thin
  gridlines, near-square corners, and a Windows-blue selection highlight —
  closer to Explorer or classic uTorrent than to a website. Nexus green shows
  up only where the real app used it: the activated-mod checkmark.
- **Liquid Glass** — light and translucent: surfaces blur what is behind them,
  over a lit background that gives them something to refract.
- **UESP** — a MediaWiki skin, not an app, and specifically UESP's own:
  warm cream/parchment rather than white, a lavender-grey for chrome
  surfaces, a medium web blue for links, and gently rounded panels rather
  than the sharp corners a wiki page usually has. Matched against a
  screenshot of the live site — this session's network policy blocks
  `uesp.net` itself, and the skin's own GitHub repo turned out to hold only
  PHP templating with no colours in it, so a screenshot was the only way
  to get this right after two earlier, unverified guesses (plain
  Wikipedia grey-and-blue, then an invented navy palette) both missed.
- **Fallout 3 terminal** — a monochrome CRT readout: green phosphor on
  black, square corners, a scanline-and-vignette overlay, and every
  clickable thing in brackets the way a terminal menu option reads as
  `[ CONTINUE ]`. Chrome — headings, table headers, buttons, badges — is
  set in caps; the mod list itself stays as typed, since a long list set
  entirely in capitals is real data made harder to scan, not more
  authentic.
- **New Vegas terminal** — the same terminal, in amber rather than green:
  the other classic CRT phosphor colour, so it's a genuine alternate rather
  than the same theme renamed. Both terminal themes keep red for a disabled
  mod — a monochrome screen can still carry a second colour for an alert,
  the way a terminal's own warning text would.

A theme is a block of custom properties. Colour, the tints behind badges and
notices, the text that sits on a solid fill, and the corner radii are all
tokens on `:root`, so a theme mostly restates values rather than rewriting
rules — Vortex is about 30 lines as a result. NMM, Liquid Glass, UESP and the
two terminals are the ones that add rules of their own: a flat button that
goes Windows-Aero-blue on hover and focus for NMM, blur and a bright inner
edge for Liquid Glass, boxed `wikitable`-style cells for UESP, and brackets,
caps and a scanline overlay for the terminals — the two terminals share that
structural CSS in one rule and differ only in their colour tokens, which is
what makes New Vegas a real "alternate" rather than a duplicate.

Two details that are easy to miss:

- Native controls — checkboxes, the select chevron, the mobile browser chrome —
  follow the `color-scheme` and `theme-color` meta tags, not our variables. The
  switcher rewrites both. Without that, an unchecked box on the light theme
  paints as a solid dark square.
- The stored preference is applied by a small script in the head, before the
  body paints, or the default would flash first. Anything unrecognised in
  storage resolves back to Midnight, since what is in there is whatever was
  last written — including by an older version of this file.

Liquid Glass drops to opaque surfaces on a flat background under
`prefers-reduced-transparency: reduce`, which is what macOS and iOS set from
their Reduce Transparency switch, and does the same where the browser cannot
blur at all.

## Sharing a load order

The format picker in the export bar switches the **Copy** and text **Download**
buttons between plain text, Markdown and BBCode. The other two buttons are
unaffected — CSV is always CSV.

Markdown writes a table, with the mod name as a link to its Nexus page where
there is one. Columns follow the same rule as the page itself: `#`, size,
collection and endorsement appear only if the loaded file carries them. The
Source and Source URL columns the CSV needs are left out, since the linked
name already carries both.

BBCode writes a `[list]` rather than a table, because forum table markup isn't
portable across forum software. Where an order exists it's written into each
line as text rather than left to `[list=1]` auto-numbering — the table can be
sorted by name while still holding MO2 priority numbers, and auto-numbering
would quietly renumber the load order to match the sort.

Both formats also work in the changes view, exporting the diff instead.

## Exporting several games at once

The **Bulk CSV** button appears when a Vortex file contains more than one game.
It opens a panel with a checkbox per game — everything ticked to start with, so
the whole-file export is still two clicks, and narrowing it costs nothing extra.
**Select all** and **Select none** are there for a file with a lot of games in
it. A Vortex install picks up games you tried once and abandoned, and their mods
are just noise in a sheet about the two games you actually play.

The export itself is the button inside the panel, which says what it will
actually do — *Download 3 games CSV* — since it sits directly under the boxes
that decide it. It writes one row per mod across the chosen games, with a `Game`
column, fixed columns so the sheet stays rectangular, and both the formatted
size and the raw byte count. The panel closes on Escape, and closes itself once
the file is on its way.

The selection is always written in the file's own game order rather than the
order the boxes were ticked, so exporting the same games twice produces the
same sheet. The filename follows the selection too — a full selection stays
`vortex-modlist-all-games.csv`, up to three games are named
(`vortex-modlist-skyrimse-fallout4.csv`), and anything larger is
`vortex-modlist-selected-games.csv` — so two different exports from one file
don't collide in the downloads folder. Game ids come out of the state file, so
only plain slugs are allowed into a filename; anything else falls back to the
generic name rather than being sanitised into something that no longer says
what it holds.

Deliberately one flat sheet rather than a tab per game: a `Game` column can be
filtered, sorted and pivoted in any spreadsheet app, which answers "what's my
largest mod across everything" or "how much disk per game" directly. Separate
tabs can't do that without extra work, and a real multi-sheet `.xlsx` would
mean either a ~900KB library inlined into this file or a CDN script — and the
page currently makes no network requests at all, which is rather the point.

Enabled state lives on the profile, so each game uses its most recently
activated one; a game with no profile at all falls back to its full installed
list, where status reads as unknown. The search, enabled-only and
not-yet-endorsed filters all apply per game, so the export matches what you'd
see stepping through each game in turn.

## Install date and same-page mods

Vortex records an `installTime` per mod, on 434 of the 436 in the library this
was built against. The **Installed** column shows the date and the
**Recently installed** sort orders by it, newest first, with anything undated
falling to the end rather than to 1970.

A separate thing the source column now says: one Nexus mod page frequently
ships several files — a main download plus optional patches — and Vortex
installs each as its own mod. 81 of those 436 share a page with something
else. That's normal, so they're counted rather than flagged: a mod sharing
its page notes how many came from it, and a mod that's the only install from
its page says nothing. Without it the same Nexus link appears several times
in a list with no indication why.

## Endorsement

Vortex records whether you've endorsed each mod on Nexus. The tool surfaces
that as a column, and the **Not yet endorsed** filter narrows the list to the
ones still waiting on you — which for a large setup is usually most of them.

"Not yet" means Vortex has the mod as *Undecided*. Deliberately excluded:
*Abstained*, because that's a decision you already made, and mods with no
endorsement state at all, which are the ones that didn't come from Nexus and
can't be endorsed.

## Load order

A third view, next to the mod list and the changes view, showing the plugin
load order for the selected Vortex game and profile.

**What it is for.** "Post your load order" is the first thing asked in almost
any modding support thread, because plugin order decides which mod's changes
win. The mod list is not that list and is not what gets asked for. The plain
text export is the numbered form people expect; Markdown and BBCode are there
for wikis and forums.

**Why it is a separate list rather than a column.** A plugin is a file inside
a mod. One mod can ship several plugins or none, so the two do not line up
row for row — in one real profile, 20 of 39 mods contribute no plugin at all.
Trying to show load order as a column on the mod list means inventing an
answer for those. Kept separate, no such question arises: Vortex records a
name and an enabled flag for every entry, so nothing has to be matched back
to a mod.

**When Vortex has not recorded one.** This is the common case, not an error.
Vortex only stores a load order for games whose extension provides one —
mostly the Bethesda titles. When the selected game has none, the view says so
in plain language and names the games in the same file that do have one,
because "this tool is broken" and "Vortex only records this for some games"
look identical otherwise. The tab itself is hidden for MO2 files, whose
`modlist.txt` contains no plugins at all and never could.

Note this is a different thing from MO2's priority order, which is about mods
overwriting each other rather than plugins loading in sequence. The two are
never shown at once, since no file carries both.

## Comparing two snapshots

Load a file, then drop a second one into the compare box that appears below
the results. The two are matched by mod ID (mod name, for MO2) and reported
as added, removed, changed or unchanged.

Direction is decided by each file's timestamp, not the order you load them
in — the older file is always the baseline, so "added" means a mod appeared
over time regardless of which one you picked first.

Results can be filtered by change type — added, removed, changed and
unchanged each toggle independently, and each filter shows its own tally so
the counts stay visible even when a type is switched off. Unchanged is off
by default. Exports follow whatever the filter is currently showing.

Both files must come from the same mod manager; comparing a Vortex state
file against an MO2 `modlist.txt` is refused rather than producing
nonsense.

A caveat specific to Vortex: enabled/disabled state lives on the *profile*,
so if the profile you're viewing doesn't exist in the other file, that side
falls back to its full installed-mod list and status can't be compared. In
that case only additions, removals and version changes are reported, and
the comparison says so. This matters because treating "unknown" as a change
would otherwise mark every single mod as modified.

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
  way to get a fresh snapshot: the other two are written automatically, but
  that scheduler can stop working without surfacing an error, leaving both
  stale for weeks — exactly what the freshness warning below is for.
- `startup.json` — rewritten each time Vortex launches.
- `hourly.json` — rewritten roughly once per hour while Vortex is running.

A `startup.json` also exists directly under `%AppData%\Vortex\` (not inside
`temp\state_backups_full`) — that one is a smaller session/window-settings
file and does **not** contain mod data. Easy to grab by mistake.

### Mod Organizer 2

MO2 keeps a plain-text modlist per profile at:

```
<MO2 install folder>\profiles\<profile name>\modlist.txt
```

Unlike Vortex, this file updates live as mods are installed, enabled, or
disabled — there's no periodic-backup staleness concern here. It only
records mod name and enabled state; version numbers and source links aren't
part of this format, so those columns will show as empty for MO2 files.

Exports are named after the detected format: `vortex-modlist.csv` /
`mo2-modlist.csv`, and likewise for `.txt`. Markdown downloads as `.md`;
BBCode downloads as `.txt`, since no extension for it is standard and it's
meant to be pasted into a forum rather than opened. The changes view adds
`-changes`, and the all-games export is `vortex-modlist-all-games.csv`.

#### Priority order in modlist.txt

`modlist.txt` is written in **reverse** of the order MO2 shows in its left
pane. The first line of the file is the *bottom* of the pane, and the last
line is the top. Because mods lower in MO2's pane win file conflicts, that
means **line 1 is the highest priority and the last line is priority 0** —
the opposite of the intuitive reading.

This was verified against a real profile rather than assumed. Two things
confirmed it: `ModOrganizer.ini` records the pane's display order in
`MainWindow_modList_index`, ending with the `Overwrite` entry that MO2
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
- [x] Diff view between two loaded snapshots (what was added/removed/updated)
- [x] Search, sort, and per-mod install sizes
- [x] Attribute mods to the collection they were installed from, and report
      collection members that aren't installed
- [x] Endorsement status, with a filter for mods not yet endorsed
- [x] Export every Vortex game at once, in one CSV
- [x] Markdown / BBCode export, for sharing a load order on a forum
- [x] Surface Vortex load order when the game extension provides it
- [x] Install date, and mods sharing a Nexus mod page

## Considered and not doing

Ideas investigated against a real 436-mod library and turned down. Recorded so
the same suggestions don't get re-litigated later.

- **Auto-refresh when the file changes on disk.** Built, and it worked. Removed
  because it needs the File System Access API, which is Chromium-only and
  unavailable when the page is opened directly from disk — the way most local
  use happens. A feature most users could not reach.
- **Duplicate-mod detection.** Grouping by Nexus mod id found 35 apparent
  duplicates, which looked compelling and was wrong: those are legitimate
  multi-file mod pages. Grouping by file checksum, which is what an actual
  duplicate shares, found none at all, and no disk held by redundant copies.
  The first version would have raised 35 false alarms on a tidy setup.
- **Disk used by disabled mods.** 0.1 GB against 26.3 GB enabled on the largest
  profile tested. No signal worth a column.
- **Mod thumbnails.** Vortex records a picture URL for most mods, but rendering
  them would make the page fetch from Nexus's CDN. It currently makes no
  network requests at all, and that is worth more than pictures.
- **Category grouping.** Vortex stores categories as numeric Nexus ids, so
  making them readable means shipping and maintaining a per-game lookup table.
- **"Update available" flags.** Only 48% of mods carry both a current and a
  newest version, and most differences are formatting rather than real updates
  — `2.0.0` against `2.0`. Mostly false positives.

## AI disclosure

This project's code, documentation, and repo setup — including the GitHub
Actions workflows and the test suite — were built in collaboration with
Claude (Anthropic), used conversationally to write and iterate on the
implementation, debug the GitHub Pages deployment, and draft this README.

Testing is a mix. The automated suite was written with Claude, as was the
verification against local Vortex and Mod Organizer 2 installs. Some findings
depended on observations only the project owner could make: MO2's priority
pane order, for one, which is what settled how `modlist.txt` ordering is
interpreted here.

Direction on features and scope was the project owner's throughout.

## Contributing

Issues and PRs welcome. Since this is a single HTML file, most changes can be
tried by just opening `index.html` in a browser after editing.

Please run the tests as well — `node --test test/*.test.js`, no install
needed. They also run automatically on every pull request, and `main`
requires them to pass.

Merging to `main` doesn't put anything live — the site only deploys when a
release is published. See [`docs/deploying.md`](docs/deploying.md) for that
flow and a GitHub Pages environment gotcha worth knowing before you cut one.

## License

MIT — see [LICENSE](LICENSE).
