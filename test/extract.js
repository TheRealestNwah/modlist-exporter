'use strict';

// index.html is deliberately a single self-contained file with no build step,
// so there is nothing to import. Instead, the pure (DOM-free) functions are
// lifted out of its <script> block and evaluated here.
//
// This couples the tests to the file's shape: each function must be declared
// at two-space indentation inside the IIFE and closed by a two-space `}`.
// That is how the file has always been written, and if it ever stops being
// true the extraction throws by name rather than silently testing nothing.

const fs = require('node:fs');
const path = require('node:path');

const INDEX = path.join(__dirname, '..', 'index.html');

const NAMES = [
  'parseMO2',
  'parseModlist',
  'statusLabel',
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
];

function extract() {
  const html = fs.readFileSync(INDEX, 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!script) {
    throw new Error('No <script> block found in index.html');
  }
  // Git's autocrlf means this file is CRLF on a Windows checkout and LF on
  // Linux CI. Normalise so the extraction markers match in both places.
  const js = script[1].replace(/\r\n/g, '\n');

  const parts = NAMES.map((name) => {
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
  });

  // Evaluated in one shared scope so the functions can call each other the
  // same way they do in the page (parseModlist -> parseMO2, diffRows ->
  // statusLabel).
  const body = parts.join('\n') + '\nreturn { ' + NAMES.join(', ') + ' };';
  return new Function(body)();
}

module.exports = extract();
