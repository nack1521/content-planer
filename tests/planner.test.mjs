import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// 1. Validate Canonical Message Dictionaries
test('Bilingual dictionary parity test (src/messages)', () => {
  const enPath = join(process.cwd(), 'src/messages/en.json');
  const thPath = join(process.cwd(), 'src/messages/th.json');

  assert.ok(existsSync(enPath), 'src/messages/en.json must exist');
  assert.ok(existsSync(thPath), 'src/messages/th.json must exist');

  const en = JSON.parse(readFileSync(enPath, 'utf8'));
  const th = JSON.parse(readFileSync(thPath, 'utf8'));

  function getAllKeys(obj, prefix = '') {
    let keys = [];
    for (const [k, v] of Object.entries(obj)) {
      const full = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        keys = keys.concat(getAllKeys(v, full));
      } else {
        keys.push(full);
      }
    }
    return keys.sort();
  }

  const enKeys = getAllKeys(en);
  const thKeys = getAllKeys(th);

  assert.deepEqual(enKeys, thKeys, 'src/messages/en.json and th.json must have 100% identical keys');
  assert.ok(enKeys.length > 50, 'Must have comprehensive message keys');
});

// 2. Validate Date Formatter in Asia/Bangkok
test('Asia/Bangkok Date formatter verification', () => {
  const d = new Date('2026-09-13T18:00:00+07:00');

  const bkkEn = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  const bkkTh = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  assert.match(bkkEn, /Sep 13, 2026/);
  assert.match(bkkTh, /13 ก\.ย\. 2569/);
});

// 3. Validate Built Pre-rendered Static Pages
test('Pre-rendered Thai planner HTML exists and contains localized content', () => {
  const thHtmlPath = join(process.cwd(), '.next/server/app/th/planner.html');
  assert.ok(
    existsSync(thHtmlPath),
    `Missing build artifact: ${thHtmlPath}. Run "npm run build" first.`
  );
  const html = readFileSync(thHtmlPath, 'utf8');
  assert.ok(html.includes('<html lang="th"'), 'HTML must set lang="th" on Thai route');
  assert.ok(html.includes('Content Planner'), 'HTML must contain App title');
  assert.ok(html.includes('แผนคอนเทนต์'), 'HTML must contain Thai navigation label');
  assert.ok(html.includes('เวลาเอเชีย/กรุงเทพ'), 'HTML must contain Thai timezone indicator');
});

test('Pre-rendered English planner HTML exists and contains localized content', () => {
  const enHtmlPath = join(process.cwd(), '.next/server/app/en/planner.html');
  assert.ok(
    existsSync(enHtmlPath),
    `Missing build artifact: ${enHtmlPath}. Run "npm run build" first.`
  );
  const html = readFileSync(enHtmlPath, 'utf8');
  assert.ok(html.includes('<html lang="en"'), 'HTML must set lang="en" on English route');
  assert.ok(html.includes('Content Planner'), 'HTML must contain App title');
  assert.ok(html.includes('Planner'), 'HTML must contain English navigation label');
  assert.ok(html.includes('Asia/Bangkok'), 'HTML must contain English timezone indicator');
});

// 4. Validate live server if running
test('Live server responses and invalid locale rejection (when server active)', async (t) => {
  let isReachable = false;
  try {
    const probe = await fetch('http://localhost:3000/', { redirect: 'manual' });
    isReachable = probe.status < 500;
  } catch (err) {
    const isConnRefused =
      err &&
      (err.code === 'ECONNREFUSED' ||
        err.cause?.code === 'ECONNREFUSED' ||
        (Array.isArray(err.cause?.errors) &&
          err.cause.errors.some((e) => e.code === 'ECONNREFUSED')));
    if (isConnRefused) {
      t.skip('Local server not running on port 3000');
      return;
    }
    throw err;
  }

  if (!isReachable) {
    t.skip('Local server not ready');
    return;
  }

  const rootRes = await fetch('http://localhost:3000/', { redirect: 'manual' });
  assert.equal(rootRes.status, 307);
  assert.equal(rootRes.headers.get('location'), '/th/planner');

  const invalidRes = await fetch('http://localhost:3000/fr/planner');
  assert.equal(invalidRes.status, 404, 'Unsupported locale /fr/planner must return 404');
});
