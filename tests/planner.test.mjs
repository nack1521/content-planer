import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// 1. Validate Message Dictionaries
test('Bilingual dictionary parity test', () => {
  const en = JSON.parse(readFileSync(join(process.cwd(), 'messages/en.json'), 'utf8'));
  const th = JSON.parse(readFileSync(join(process.cwd(), 'messages/th.json'), 'utf8'));

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

  assert.deepEqual(enKeys, thKeys, 'en.json and th.json must have 100% identical keys');
  assert.ok(enKeys.length > 50, 'Must have comprehensive message keys');
});

// 2. Validate Date Formatter in Asia/Bangkok
test('Asia/Bangkok Date formatter verification', async () => {
  const d = new Date('2026-09-13T18:00:00+07:00');
  
  const bkkEn = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);

  const bkkTh = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);

  assert.match(bkkEn, /Sep 13, 2026/);
  assert.match(bkkTh, /13 ก\.ย\. 2569/);
});

// 3. Validate Production HTML Response for Thai and English
test('Local Next.js server serves pre-rendered Thai HTML with planner content', async () => {
  const res = await fetch('http://localhost:3000/th/planner');
  assert.equal(res.status, 200);
  const html = await res.text();

  assert.ok(html.includes('Content Planner'), 'HTML must contain App title');
  assert.ok(html.includes('แผนคอนเทนต์'), 'HTML must contain Thai navigation label');
  assert.ok(html.includes('เวลาเอเชีย/กรุงเทพ'), 'HTML must contain Thai timezone indicator');
});

test('Local Next.js server serves pre-rendered English HTML with planner content', async () => {
  const res = await fetch('http://localhost:3000/en/planner');
  assert.equal(res.status, 200);
  const html = await res.text();

  assert.ok(html.includes('Content Planner'), 'HTML must contain App title');
  assert.ok(html.includes('Planner'), 'HTML must contain English navigation label');
  assert.ok(html.includes('Asia/Bangkok'), 'HTML must contain English timezone indicator');
});

test('Root redirect to /th/planner works', async () => {
  const res = await fetch('http://localhost:3000/', { redirect: 'manual' });
  assert.equal(res.status, 307);
  assert.equal(res.headers.get('location'), '/th/planner');
});
