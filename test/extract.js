'use strict';

// index.html is deliberately a single self-contained file with no build step,
// so there is nothing to import. Instead, the pure (DOM-free) functions are
// lifted out of its <script> block and evaluated here.
//
// This couples the tests to the file's shape: each function must be declared
// at two-space indentation inside the IIFE and closed by a two-space `}`.
// That is how the file has always been written, and if it ever stops being
// true the extraction throws by name rather than silently testing nothing.
//
// NAMES below is maintained by hand, and forgetting to add a newly extracted
// helper to it has broken the suite three separate times -- each time as a
// wall of ReferenceErrors across ~34 tests, which says nothing about the
// actual cause. checkNamesAreComplete() turns that into one message naming
// the functions to add.

const fs = require('node:fs');
const path = require('node:path');

const INDEX = path.join(__dirname, '..', 'index.html');

const NAMES = [
  'parseMO2',
  'parseModlist',
  'statusLabel',
  'columnsIn',
  'csvStatus',
  'diffRows',
  'buildRows',
  'csvCell',
  'formatSize',
  'matchesQuery',
  'indexModsForMatching',
  'matchRule',
  'collectionMembership',
  'collectionLabel',
  'viewState',
  'missingCollectionMembers',
  'endorsementLabel',
  'isUnendorsed',
  'defaultProfileFor',
  'gamesWithMods',
  'allGamesRows',
  'allGamesFileName',
  'diffDetail',
  'mdCell',
  'bbSafe',
  'safeHttpUrl',
  'mdLink',
  'bbLink',
  'markdownLines',
  'bbcodeLines',
  'markdownDiffLines',
  'bbcodeDiffLines',
  'loadOrderFor',
  'gamesWithLoadOrder',
  'loadOrderNote',
  'installedAt',
  'installedLabel',
  'nexusPageCounts',
  'themeIds',
  'legacyThemeId',
  'resolveTheme',
  'themeMeta',
];

// Extracted functions are evaluated in a scope containing only each other, so
// one of them calling a helper that was never extracted throws ReferenceError
// at call time -- in every test that reaches it. This looks for that before it
// happens: anything the extracted code calls, which index.html defines as a
// top-level function of the IIFE, has to be in NAMES too.
function checkNamesAreComplete(js) {
  // Every function the IIFE declares at its top level.
  const declared = new Set(
    [...js.matchAll(/^ {2}function ([A-Za-z_$][\w$]*)\s*\(/gm)].map((m) => m[1])
  );

  // Comments mention functions in prose ("see render() for why"), and a match
  // there is not a call. Strip them before looking for call sites.
  const code = NAMES.map((name) => sliceFunction(js, name))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ');

  const called = new Set([...code.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]));
  const missing = [...called].filter((n) => declared.has(n) && !NAMES.includes(n)).sort();

  if (missing.length) {
    throw new Error(
      'test/extract.js is out of date.\n\n' +
      '  Extracted code calls these functions, but they are not in NAMES:\n' +
      missing.map((n) => '    ' + n).join('\n') + '\n\n' +
      '  Add them to NAMES (and to the list in the README), or every test that\n' +
      '  reaches them fails with ReferenceError instead of telling you this.'
    );
  }
}

// Shared by the guard and the extraction so they can never disagree about
// where a function starts and ends.
function sliceFunction(js, name) {
  const open = '  function ' + name + '(';
  const start = js.indexOf(open);
  if (start === -1) {
    throw new Error(
      'Could not find ' + name + '() in index.html. If it was renamed or ' +
      're-indented, update NAMES in test/extract.js.'
    );
  }
  const close = '\n  }\n';
  const end = js.indexOf(close, start);
  if (end === -1) {
    throw new Error('Could not find the end of ' + name + '() in index.html.');
  }
  return js.slice(start, end + '\n  }'.length);
}

function extract() {
  const html = fs.readFileSync(INDEX, 'utf8');

  // index.html has more than one script element -- there is a small one in the
  // head that applies the stored theme before first paint. Pick the block by
  // what is in it rather than by position, so adding another one cannot
  // silently point this at the wrong code. (Matching on the opening tag alone
  // is worse than it looks: the tag spelled out inside a comment matches too.)
  const blocks = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1])
    .filter((body) => body.includes('function parseModlist('));
  if (blocks.length !== 1) {
    throw new Error(
      'Expected exactly one script block in index.html defining parseModlist(), found ' +
      blocks.length + '. If the file was restructured, update test/extract.js.'
    );
  }
  // Git's autocrlf means this file is CRLF on a Windows checkout and LF on
  // Linux CI. Normalise so the extraction markers match in both places.
  const js = blocks[0].replace(/\r\n/g, '\n');

  checkNamesAreComplete(js);

  const parts = NAMES.map((name) => sliceFunction(js, name));

  // Evaluated in one shared scope so the functions can call each other the
  // same way they do in the page (parseModlist -> parseMO2, diffRows ->
  // statusLabel).
  const body = parts.join('\n') + '\nreturn { ' + NAMES.join(', ') + ' };';
  return new Function(body)();
}

module.exports = extract();
