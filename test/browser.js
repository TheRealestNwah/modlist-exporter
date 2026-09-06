'use strict';

// A very small browser driver, so the smoke test can check the wiring the
// unit tests cannot reach: whether listeners are attached, whether an element
// id is right, whether switching views leaves the previous one's furniture on
// screen. Those are the failures that ship silently.
//
// Deliberately no Playwright and no packages. Node's built-in WebSocket plus
// the DevTools Protocol is enough to open a page, run an expression in it, and
// read the answer back, which is all this needs. The project's whole claim is
// that it has nothing to install; a test suite that needs a 200MB download to
// verify that would be an odd way to keep the promise.

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Windows dev machines and Linux CI runners, in that order. Anything else
// simply reports no browser and the smoke test skips rather than fails.
const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
].filter(Boolean);

function findBrowser() {
  return CANDIDATES.find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } }) || null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fileUrl(p) {
  return 'file:///' + path.resolve(p).replace(/\\/g, '/');
}

// Opens index.html in a headless browser, hands `fn` an object for talking to
// it, and always tears the browser down afterwards.
async function withPage(fn) {
  const bin = findBrowser();
  if (!bin) throw new Error('no browser available');

  // A random port and a throwaway profile, so a stray browser from an earlier
  // run cannot be mistaken for this one.
  const port = 9500 + Math.floor(Math.random() * 400);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'modlist-smoke-'));
  const target = fileUrl(path.join(__dirname, '..', 'index.html'));

  const proc = spawn(bin, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + profile,
    target,
  ], { stdio: 'ignore' });

  let ws = null;
  try {
    const page = await waitForPage(port);
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = () => rej(new Error('could not connect to the browser'));
    });

    const pending = new Map();
    const consoleErrors = [];
    let nextId = 0;
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
        return;
      }
      // Anything the page throws or logs as an error, captured for assertion.
      if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails;
        consoleErrors.push((d.exception && d.exception.description) || d.text);
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map((a) => a.description || a.value).join(' '));
      }
    };

    const send = (method, params) => new Promise((res) => {
      const id = ++nextId;
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });

    await send('Runtime.enable');

    // Runs an expression in the page and returns its value. Top-level await
    // works, so a test can wait for the app's own async work to settle.
    const evaluate = async (expression) => {
      const reply = await send('Runtime.evaluate', {
        expression: '(async () => { ' + expression + ' })()',
        awaitPromise: true,
        returnByValue: true,
      });
      const r = reply.result;
      if (r.exceptionDetails) {
        const e = r.exceptionDetails;
        throw new Error('page threw: ' + ((e.exception && e.exception.description) || e.text));
      }
      return r.result.value;
    };

    // The page is opened with the browser, so it may still be parsing.
    for (let i = 0; i < 40; i++) {
      if (await evaluate('return !!document.getElementById("fileInput");')) break;
      await sleep(100);
    }

    return await fn({ evaluate, consoleErrors });
  } finally {
    if (ws) { try { ws.close(); } catch (e) { /* already gone */ } }
    proc.kill();
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { /* best effort */ }
  }
}

async function waitForPage(port) {
  for (let i = 0; i < 60; i++) {
    await sleep(200);
    try {
      const res = await fetch('http://127.0.0.1:' + port + '/json/list');
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch (e) { /* endpoint not up yet */ }
  }
  throw new Error('the browser never exposed a page to drive');
}

module.exports = { findBrowser, withPage };
