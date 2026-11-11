'use strict';

// The wiring the unit tests cannot see.
//
// modlist.test.js covers the pure functions: given these rows, what should be
// shown. It cannot tell whether a listener is attached, whether an element id
// is right, or whether switching views leaves the previous one's furniture on
// screen. Those failures are silent -- one of them shipped for several
// releases, showing "4 changes" above a mod list with the changes tab lit.
//
// So this drives a real browser and checks the seams. It is deliberately thin:
// a handful of paths that would each be embarrassing to break, not a second
// copy of the unit suite.

const test = require('node:test');
const assert = require('node:assert');
const { findBrowser, withPage } = require('./browser.js');

const browser = findBrowser();

// Locally these skip when there is no browser, so `node --test test/*.test.js`
// still works on a bare machine. In CI that would be silent theatre: the suite
// would pass green having verified nothing. SMOKE_REQUIRED makes a missing
// browser a failure instead, and the workflow sets it.
if (!browser && process.env.SMOKE_REQUIRED) {
  throw new Error(
    'SMOKE_REQUIRED is set but no browser was found. These tests must run here. ' +
    'Set CHROME_PATH, or install Chrome or Chromium on the runner.'
  );
}
const skip = browser ? false : 'no browser found; set CHROME_PATH to run these';

// One Vortex file exercising most of the surface at once: two games, a
// profile, sizes, an endorsement, a collection with a member and a missing
// one, and a load order for only one of the games.
const FIXTURE = JSON.stringify({ persistent: {
  mods: {
    morrowind: {
      pack: { type: 'collection', attributes: {
        customFileName: 'A Collection', source: 'nexus', collectionSlug: 'abc123',
        downloadGame: 'morrowind', modSize: 524288, endorsed: 'Endorsed',
        installTime: '2026-01-02T10:00:00Z' },
        rules: [{ type: 'requires', reference: { fileMD5: 'm1' } },
                { type: 'requires', reference: { description: 'Not Installed' } }] },
      a: { attributes: { name: 'Patch for Purists', modName: 'Purist Fixes', fileMD5: 'm1', source: 'nexus',
        modId: 46599, modSize: 12582912, endorsed: 'Undecided',
        installTime: '2026-02-01T10:00:00Z' } },
      b: { attributes: { name: 'Better Bodies', source: 'nexus', modId: 46599,
        modSize: 4194304, installTime: '2024-05-05T10:00:00Z' } },
    },
    skyrimse: { s: { attributes: { name: 'SkyUI Main File', modName: 'SkyUI', source: 'nexus',
      modId: 12604, modSize: 9437184 } } },
  },
  profiles: {
    pm: { gameId: 'morrowind', name: 'Default', lastActivated: 9,
      modState: { pack: { enabled: true }, a: { enabled: true }, b: { enabled: false } } },
    ps: { gameId: 'skyrimse', name: 'Main', lastActivated: 9, modState: { s: { enabled: true } } },
  },
  loadOrder: { pm: [
    { name: 'Morrowind.esm', enabled: true },
    { name: 'Patch for Purists.esp', enabled: true },
    { name: 'Retired.esp', enabled: false },
  ] },
} });

// Pushes a file through the real <input>, the way a person choosing one does,
// rather than calling the app's internals.
const loadFile = (name, body, type) => `
  const dt = new DataTransfer();
  dt.items.add(new File([${JSON.stringify(body)}], ${JSON.stringify(name)},
    { type: ${JSON.stringify(type)}, lastModified: Date.now() }));
  const input = document.getElementById('fileInput');
  input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 400));
`;

const SHOWN = `(id) => document.getElementById(id).classList.contains('show')`;

test('smoke: the page loads, parses a real file, and renders rows', { skip }, async () => {
  const out = await withPage(async ({ evaluate, consoleErrors }) => {
    await evaluate(loadFile('manual.json', FIXTURE, 'application/json'));
    return {
      status: await evaluate('return document.getElementById("status").textContent;'),
      rows: await evaluate('return document.querySelectorAll("#modTableBody tr").length;'),
      total: await evaluate('return document.getElementById("sizeTotal").textContent.trim();'),
      errors: consoleErrors,
    };
  });
  assert.match(out.status, /Loaded manual\.json/);
  assert.ok(out.rows > 0, 'the table should have rows');
  assert.match(out.total, /on disk/);
  assert.deepStrictEqual(out.errors, [], 'the page should log no errors');
});

test('smoke: the load order tab is reachable without loading a second file', { skip }, async () => {
  // The bug this test exists for: viewOrderBtn was un-hidden correctly, but
  // its container only got .show when a comparison file arrived, so the whole
  // view was unreachable unless you happened to use the diff. Clicking the
  // button in a test still worked, which is why the first version of this file
  // did not catch it -- so this asks what a person can actually see and hit,
  // not whether .click() reaches a handler.
  const out = await withPage(async ({ evaluate, consoleErrors }) => {
    await evaluate(loadFile('manual.json', FIXTURE, 'application/json'));
    const before = await evaluate(`
      const btn = document.getElementById('viewOrderBtn');
      // elementFromPoint works in viewport coordinates, and the tab bar sits
      // well below the fold in a headless window, so bring it on screen first.
      btn.scrollIntoView({ block: 'center' });
      await new Promise(r => setTimeout(r, 100));
      const r = btn.getBoundingClientRect();
      return {
        tabsDisplay: getComputedStyle(document.getElementById('viewTabs')).display,
        orderVisible: r.width > 0 && r.height > 0,
        // Whatever is painted at the middle of the button is what a click lands on.
        hitTarget: (document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) || {}).id || null,
        // No comparison loaded yet, so Changes would be a dead button.
        changesOffered: !document.getElementById('viewDiffBtn').hidden,
      };
    `);
    await evaluate(`document.getElementById('viewOrderBtn').click();
                    await new Promise(r => setTimeout(r, 250));`);
    return {
      before,
      rows: await evaluate('return document.querySelectorAll("#orderTableBody tr").length;'),
      errors: consoleErrors,
    };
  });
  assert.strictEqual(out.before.tabsDisplay, 'flex', 'the tab bar must be on screen');
  assert.strictEqual(out.before.orderVisible, true, 'the load order tab must have a size');
  assert.strictEqual(out.before.hitTarget, 'viewOrderBtn', 'a click at the tab must land on it');
  assert.strictEqual(out.before.changesOffered, false, 'no comparison yet, so no changes tab');
  assert.strictEqual(out.rows, 3, 'and it must lead to the load order');
  assert.deepStrictEqual(out.errors, []);
});

test('smoke: an MO2 file with nothing to compare shows no tab bar at all', { skip }, async () => {
  // The other half: a bar whose only tab is the view you are already in.
  const mo2 = ['# generated by Mod Organizer', '+Zulu', '-Yankee'].join(String.fromCharCode(10));
  const out = await withPage(async ({ evaluate }) => {
    await evaluate(loadFile('modlist.txt', mo2, 'text/plain'));
    return evaluate(`return getComputedStyle(document.getElementById('viewTabs')).display;`);
  });
  assert.strictEqual(out, 'none');
});

test('smoke: every view tab switches cleanly, leaving nothing behind', { skip }, async () => {
  // The regression this file exists for: a view change that resets `view` but
  // not the chrome, leaving one view's furniture standing in another.
  const snapshot = `
    const shown = ${SHOWN};
    return {
      active: [...document.querySelectorAll('.view-tabs button')]
        .filter(b => b.classList.contains('active')).map(b => b.textContent).join(','),
      modTable: shown('modTable'),
      diffTable: shown('diffTable'),
      orderTable: shown('orderTable'),
      diffFilters: shown('diffFilters'),
      label: document.getElementById('countLabel').textContent,
    };
  `;
  const seen = await withPage(async ({ evaluate, consoleErrors }) => {
    await evaluate(loadFile('manual.json', FIXTURE, 'application/json'));
    const list = await evaluate(snapshot);
    await evaluate(`document.getElementById('viewOrderBtn').click();
                    await new Promise(r => setTimeout(r, 250));`);
    const order = await evaluate(snapshot);
    await evaluate(`document.getElementById('viewListBtn').click();
                    await new Promise(r => setTimeout(r, 250));`);
    const back = await evaluate(snapshot);
    return { list, order, back, errors: consoleErrors };
  });

  assert.deepStrictEqual(seen.list,
    { active: 'Mod list', modTable: true, diffTable: false, orderTable: false,
      diffFilters: false, label: 'mods' });
  assert.deepStrictEqual(seen.order,
    { active: 'Load order', modTable: false, diffTable: false, orderTable: true,
      diffFilters: false, label: 'plugins' });
  assert.deepStrictEqual(seen.back, seen.list, 'going back must restore the list view exactly');
  assert.deepStrictEqual(seen.errors, []);
});

test('smoke: a game with no load order explains itself instead of looking broken', { skip }, async () => {
  const out = await withPage(async ({ evaluate }) => {
    await evaluate(loadFile('manual.json', FIXTURE, 'application/json'));
    await evaluate(`document.getElementById('viewOrderBtn').click();
                    await new Promise(r => setTimeout(r, 250));`);
    const withOrder = await evaluate('return document.querySelectorAll("#orderTableBody tr").length;');
    await evaluate(`
      const g = document.getElementById('gameSelect');
      g.value = 'skyrimse';
      g.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 250));
    `);
    return {
      withOrder,
      tableShown: await evaluate(`return (${SHOWN})('orderTable');`),
      noteShown: await evaluate(`return (${SHOWN})('orderNote');`),
      note: await evaluate('return document.getElementById("orderNote").textContent;'),
    };
  });
  assert.strictEqual(out.withOrder, 3);
  assert.strictEqual(out.tableShown, false, 'no table when there is no order');
  assert.strictEqual(out.noteShown, true, 'the explanation takes its place');
  assert.match(out.note, /morrowind/, 'it names a game that does have one');
});

test('smoke: CSV page columns describe the exported rows (#58, #59, #61)', { skip }, async () => {
  const out = await withPage(async ({ evaluate }) => {
    await evaluate(loadFile('manual.json', FIXTURE, 'application/json'));
    return evaluate(`
      let captured = null, filename = null;
      const RealBlob = window.Blob;
      window.Blob = function (parts, opts) { captured = parts.join(''); return new RealBlob(parts, opts); };
      const realCreate = document.createElement.bind(document);
      document.createElement = function (tag) {
        const el = realCreate(tag);
        if (tag === 'a') Object.defineProperty(el, 'click', { value: () => { filename = el.download; } });
        return el;
      };
      function read(button) {
        document.getElementById(button).click();
        // This fixture's fields contain no commas or newlines.
        const [header, ...lines] = captured.trim().split(String.fromCharCode(10));
        const columns = header.trim().split(',');
        const rows = lines.map(line => {
          const fields = line.trim().split(',').map(field => field.slice(1, -1));
          if (fields.length !== columns.length) throw new Error('CSV row width differs from header');
          return Object.fromEntries(columns.map((column, i) => [column, fields[i]]));
        });
        return { filename, columns, rows };
      }
      function toggle(id, checked) {
        const box = document.getElementById(id);
        box.checked = checked;
        box.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const single = read('csvBtn');
      document.getElementById('bulkBtn').click();
      const filtered = read('bulkGoBtn');
      toggle('onlyEnabled', false);
      const ungrouped = read('bulkGoBtn');
      toggle('groupPages', true);
      const grouped = read('bulkGoBtn');
      document.createElement = realCreate;
      window.Blob = RealBlob;
      return { single, filtered, ungrouped, grouped };
    `);
  });
  const find = (sheet, name) => sheet.rows.find(row => row.Name === name);
  assert.strictEqual(out.single.filename, 'vortex-modlist.csv');
  assert.deepStrictEqual(out.single.columns.slice(0, 2), ['Name', 'Version']);
  assert.strictEqual(find(out.single, 'Patch for Purists')['From same Nexus page'], '');
  assert.strictEqual(find(out.filtered, 'Patch for Purists')['From same Nexus page'], '');
  assert.strictEqual(find(out.filtered, 'SkyUI Main File')['Mod Name'], 'SkyUI');
  assert.strictEqual(out.filtered.columns.includes('Also installed'), false);
  assert.strictEqual(out.ungrouped.columns.includes('Also installed'), false);
  assert.strictEqual(find(out.ungrouped, 'Patch for Purists')['From same Nexus page'], '2');
  assert.strictEqual(find(out.ungrouped, 'Better Bodies')['From same Nexus page'], '2');
  assert.strictEqual(find(out.grouped, 'Purist Fixes')['Mod Name'], 'Purist Fixes');
  assert.strictEqual(find(out.grouped, 'Purist Fixes')['Also installed'], 'Better Bodies');
  assert.strictEqual(find(out.grouped, 'Purist Fixes')['From same Nexus page'], '');
});

test('smoke: an MO2 file hides everything Vortex-only', { skip }, async () => {
  const mo2 = ['# generated by Mod Organizer', '+Zulu', '-Yankee', '+Sep_separator', '+Xray'].join('\n');
  const out = await withPage(async ({ evaluate, consoleErrors }) => {
    await evaluate(loadFile('modlist.txt', mo2, 'text/plain'));
    return {
      rows: await evaluate('return document.querySelectorAll("#modTableBody tr").length;'),
      orderTabHidden: await evaluate('return document.getElementById("viewOrderBtn").hidden;'),
      sizeHidden: await evaluate(`return document.getElementById('modTable').classList.contains('no-size');`),
      collHidden: await evaluate(`return document.getElementById('modTable').classList.contains('no-coll');`),
      errors: consoleErrors,
    };
  });
  // Zulu and Xray are enabled; Yankee is disabled and the separator is dropped.
  assert.strictEqual(out.rows, 2);
  assert.strictEqual(out.orderTabHidden, true);
  assert.strictEqual(out.sizeHidden, true);
  assert.strictEqual(out.collHidden, true);
  assert.deepStrictEqual(out.errors, []);
});
