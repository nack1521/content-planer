import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeEmail, isAllowedEmail } from '../src/utils/auth/allowedEmail.ts';
import { NextResponse } from 'next/server.js';

import { createRedirectResponse } from '../src/utils/supabase/redirect.ts';

// 1. Email Normalization and Single-Owner Validation
test('Allowed email normalization and authorization', () => {
  assert.equal(normalizeEmail(null), '');
  assert.equal(normalizeEmail(undefined), '');
  assert.equal(normalizeEmail('   '), '');
  assert.equal(normalizeEmail('  CREATOR@Example.COM  '), 'creator@example.com');

  const originalAllowed = process.env.ALLOWED_EMAIL;

  try {
    process.env.ALLOWED_EMAIL = 'owner@studio.test';

    // Authorized tests
    assert.equal(isAllowedEmail('owner@studio.test'), true);
    assert.equal(isAllowedEmail('OWNER@STUDIO.TEST'), true);
    assert.equal(isAllowedEmail('  owner@studio.test  '), true);
    assert.equal(isAllowedEmail('  OWNER@studio.test  '), true);

    // Unauthorized tests
    assert.equal(isAllowedEmail('attacker@studio.test'), false);
    assert.equal(isAllowedEmail('owner@studio.testing'), false);
    assert.equal(isAllowedEmail('sub.owner@studio.test'), false);
    assert.equal(isAllowedEmail(''), false);
    assert.equal(isAllowedEmail(null), false);
    assert.equal(isAllowedEmail(undefined), false);

    // When ALLOWED_EMAIL is unset or empty, all access must be denied
    delete process.env.ALLOWED_EMAIL;
    assert.equal(isAllowedEmail('owner@studio.test'), false);

    process.env.ALLOWED_EMAIL = '';
    assert.equal(isAllowedEmail('owner@studio.test'), false);
  } finally {
    if (originalAllowed !== undefined) {
      process.env.ALLOWED_EMAIL = originalAllowed;
    } else {
      delete process.env.ALLOWED_EMAIL;
    }
  }
});

// 2. Database Migrations and RLS Security Invariants
test('Database migrations enforce RLS, empty search_path, composite FKs and owner security invariants', () => {
  const schemaMigration = join(
    process.cwd(),
    'supabase/migrations/20260914000000_create_mvp_schema.sql'
  );
  const storageMigration = join(
    process.cwd(),
    'supabase/migrations/20260914000001_create_storage_and_user_trigger.sql'
  );
  const pgtapTest = join(
    process.cwd(),
    'supabase/tests/database/rls.test.sql'
  );

  assert.ok(existsSync(schemaMigration), 'Schema migration file must exist');
  assert.ok(existsSync(storageMigration), 'Storage migration file must exist');
  assert.ok(existsSync(pgtapTest), 'pgTAP executable test suite must exist');

  const schemaSql = readFileSync(schemaMigration, 'utf8');
  const storageSql = readFileSync(storageMigration, 'utf8');

  // Verify all MVP tables have Row Level Security enabled
  const requiredTables = [
    'user_preferences',
    'content_pillars',
    'content_items',
    'content_media',
  ];

  for (const table of requiredTables) {
    const rlsRegex = new RegExp(
      `ALTER\\s+TABLE\\s+public\\.${table}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
      'i'
    );
    assert.ok(
      rlsRegex.test(schemaSql),
      `Table public.${table} must explicitly enable Row Level Security`
    );
  }

  // Verify security functions set empty search_path
  assert.ok(
    schemaSql.includes("set search_path = ''"),
    'handle_updated_at function must specify set search_path = ""'
  );
  assert.ok(
    storageSql.includes("set search_path = ''"),
    'handle_new_user security definer function must specify set search_path = ""'
  );

  // Verify composite foreign keys guarantee same-owner integrity
  const pillarFkRegex = /foreign\s+key\s+\(content_pillar_id,\s*user_id\)\s+references\s+public\.content_pillars\s*\(id,\s*user_id\)/i;
  assert.ok(
    pillarFkRegex.test(schemaSql),
    'content_items must enforce composite foreign key on (content_pillar_id, user_id)'
  );

  const mediaFkRegex = /foreign\s+key\s+\(content_item_id,\s*user_id\)\s+references\s+public\.content_items\s*\(id,\s*user_id\)/i;
  assert.ok(
    mediaFkRegex.test(schemaSql),
    'content_media must enforce composite foreign key on (content_item_id, user_id)'
  );

  // Verify auth.uid() = user_id policies on user-scoped tables
  assert.ok(
    schemaSql.includes('auth.uid() = user_id'),
    'Schema must enforce auth.uid() = user_id on user data tables'
  );

  // Verify same-owner relationship checks on both insert and update
  assert.ok(
    schemaSql.includes('where id = content_pillar_id and user_id = auth.uid()'),
    'content_items policies must verify content_pillar_id belongs to the authenticated user on insert and update'
  );
  assert.ok(
    schemaSql.includes('where id = content_item_id and user_id = auth.uid()'),
    'content_media policies must verify content_item_id belongs to the authenticated user on insert and update'
  );

  // Storage bucket must be strictly private (public = false)
  const bucketPrivateRegex = /insert\s+into\s+storage\.buckets[\s\S]*?'content-media'[\s\S]*?false/i;
  assert.ok(
    bucketPrivateRegex.test(storageSql),
    'content-media storage bucket must be configured as private (public = false)'
  );

  // Storage objects must be partitioned by auth.uid()
  assert.ok(
    storageSql.includes("auth.uid()::text = (storage.foldername(name))[1]"),
    'Storage policies must scope access to the folder named after auth.uid()'
  );

  // Verify explicit privilege revocation from anon/public
  assert.ok(
    schemaSql.includes('revoke all on all tables in schema public from anon, public;'),
    'Schema must revoke all public permissions from anon role'
  );
  assert.ok(
    schemaSql.includes('grant usage on schema public to authenticated;'),
    'Schema must grant explicit permissions to authenticated role'
  );

  // Verify no hardcoded passwords, tokens, or service-role keys are present
  assert.ok(!schemaSql.includes('service_role'), 'Migrations must not contain service_role privileges');
  assert.ok(!storageSql.includes('service_role'), 'Storage migrations must not contain service_role privileges');

  // Verify composite content-pillar foreign key uses ON DELETE SET NULL on content_pillar_id only
  assert.ok(
    /foreign\s+key\s+\(content_pillar_id,\s*user_id\)\s+references\s+public\.content_pillars\s*\(id,\s*user_id\)\s+on\s+delete\s+set\s+null\s+\(content_pillar_id\)/i.test(
      schemaSql
    ),
    'content_items composite foreign key must specify on delete set null (content_pillar_id)'
  );

  // Verify handle_new_user execution permissions are explicitly revoked
  assert.ok(
    storageSql.includes(
      'revoke execute on function public.handle_new_user() from public, anon, authenticated;'
    ),
    'handle_new_user execution must be explicitly revoked from public, anon, authenticated'
  );
});

// 3. Supabase SSR Proxy Contract & Cookie Propagation
test('Proxy contract adheres to Next.js 16 conventions and preserves cookies on custom redirects', () => {
  const proxyTsPath = join(process.cwd(), 'src/proxy.ts');
  const proxyUtilPath = join(process.cwd(), 'src/utils/supabase/proxy.ts');
  const deprecatedMiddlewarePath = join(process.cwd(), 'src/middleware.ts');

  assert.ok(existsSync(proxyTsPath), 'src/proxy.ts must exist');
  assert.ok(existsSync(proxyUtilPath), 'src/utils/supabase/proxy.ts must exist');
  assert.ok(!existsSync(deprecatedMiddlewarePath), 'Deprecated src/middleware.ts must be removed');

  const proxyTs = readFileSync(proxyTsPath, 'utf8');
  const proxyUtil = readFileSync(proxyUtilPath, 'utf8');

  assert.ok(proxyTs.includes('export async function proxy'), 'src/proxy.ts must export named proxy function');
  assert.ok(proxyUtil.includes('getClaims()'), 'Proxy must validate session via getClaims()');
  assert.ok(proxyUtil.includes('createRedirectResponse'), 'Proxy must use createRedirectResponse to preserve cookies');
  assert.ok(proxyUtil.includes('!supabaseUrl || !supabaseKey || !allowedEmail'), 'Proxy must fail closed when config missing');

  // Verify cookie and header preservation behavior
  const sourceResponse = NextResponse.next();
  sourceResponse.cookies.set('sb-access-token', 'test-token', { path: '/', httpOnly: true });
  sourceResponse.cookies.set('sb-refresh-token', 'test-refresh', { path: '/', httpOnly: true });
  sourceResponse.headers.set('x-source-trace', 'trace-id-abc-123');
  sourceResponse.headers.set('x-correlation-id', 'corr-456');
  sourceResponse.headers.set('location', 'http://localhost:3000/stale-destination');

  const redirectResponse = createRedirectResponse('http://localhost:3000/th/login', sourceResponse);

  assert.equal(redirectResponse.status, 307);
  // Preserves redirect location without being overwritten by source
  assert.equal(redirectResponse.headers.get('location'), 'http://localhost:3000/th/login');
  // Preserves source non-redirect headers
  assert.equal(redirectResponse.headers.get('x-source-trace'), 'trace-id-abc-123');
  assert.equal(redirectResponse.headers.get('x-correlation-id'), 'corr-456');

  const accessTokenCookie = redirectResponse.cookies.get('sb-access-token');
  const refreshTokenCookie = redirectResponse.cookies.get('sb-refresh-token');

  assert.ok(accessTokenCookie, 'Redirect response must preserve sb-access-token cookie');
  assert.equal(accessTokenCookie.value, 'test-token');
  assert.ok(refreshTokenCookie, 'Redirect response must preserve sb-refresh-token cookie');
  assert.equal(refreshTokenCookie.value, 'test-refresh');
});

// 4. Translation Dictionary Auth Parity
test('Bilingual dictionary auth namespace parity', () => {
  const enPath = join(process.cwd(), 'src/messages/en.json');
  const thPath = join(process.cwd(), 'src/messages/th.json');

  const en = JSON.parse(readFileSync(enPath, 'utf8'));
  const th = JSON.parse(readFileSync(thPath, 'utf8'));

  assert.ok(en.auth, 'en.json must have auth namespace');
  assert.ok(th.auth, 'th.json must have auth namespace');

  const requiredAuthKeys = [
    'loginTitle',
    'loginSubtitle',
    'emailLabel',
    'emailPlaceholder',
    'sendMagicLink',
    'sending',
    'magicLinkSentTitle',
    'neutralSuccessMessage',
    'invalidEmailMessage',
    'unauthorizedTitle',
    'unauthorizedMessage',
    'errorTitle',
    'errorGeneric',
    'callbackVerifying',
    'callbackSuccess',
    'signOut',
    'signingOut',
    'ownerOnlyBadge',
    'backToLogin',
  ];

  for (const key of requiredAuthKeys) {
    assert.ok(en.auth[key], `en.json missing auth.${key}`);
    assert.ok(th.auth[key], `th.json missing auth.${key}`);
    assert.ok(typeof en.auth[key] === 'string' && en.auth[key].length > 0, `en.auth.${key} must not be empty`);
    assert.ok(typeof th.auth[key] === 'string' && th.auth[key].length > 0, `th.auth.${key} must not be empty`);
  }

  // Exact parity between en.auth and th.auth keys
  const enAuthKeys = Object.keys(en.auth).sort();
  const thAuthKeys = Object.keys(th.auth).sort();
  assert.deepEqual(enAuthKeys, thAuthKeys, 'en.auth and th.auth keys must be 100% identical');
});

// 5. Pre-rendered Localized Login Pages
test('Pre-rendered Thai and English login HTML exist and contain localized content', () => {
  const thHtmlPath = join(process.cwd(), '.next/server/app/th/login.html');
  const enHtmlPath = join(process.cwd(), '.next/server/app/en/login.html');

  assert.ok(existsSync(thHtmlPath), `Missing build artifact: ${thHtmlPath}. Run "npm run build" first.`);
  assert.ok(existsSync(enHtmlPath), `Missing build artifact: ${enHtmlPath}. Run "npm run build" first.`);

  const thHtml = readFileSync(thHtmlPath, 'utf8');
  const enHtml = readFileSync(enHtmlPath, 'utf8');

  assert.ok(thHtml.includes('<html lang="th"'), 'Thai login page must set lang="th"');
  assert.ok(thHtml.includes('เข้าสู่ระบบ'), 'Thai login page must contain Thai title');

  assert.ok(enHtml.includes('<html lang="en"'), 'English login page must set lang="en"');
  assert.ok(enHtml.includes('Sign In'), 'English login page must contain English title');
});

// 6. Live Server Route Protection and Auth Endpoints
test('Live server route protection and auth endpoints', async () => {
  const probe = await fetch('http://localhost:3000/', { redirect: 'manual' });
  assert.ok(probe.status < 500, 'Local test server must be reachable on port 3000');

  // Unauthenticated requests to protected routes must redirect to localized login
  const protectedRoutes = [
    { path: '/th/planner', expectedRedirect: '/th/login' },
    { path: '/en/planner', expectedRedirect: '/en/login' },
    { path: '/th/calendar', expectedRedirect: '/th/login' },
    { path: '/th/ideas', expectedRedirect: '/th/login' },
    { path: '/th/settings', expectedRedirect: '/th/login' },
  ];

  for (const { path, expectedRedirect } of protectedRoutes) {
    const res = await fetch(`http://localhost:3000${path}`, { redirect: 'manual' });
    assert.equal(
      res.status,
      307,
      `Unauthenticated ${path} must return 307 Temporary Redirect`
    );
    const location = res.headers.get('location');
    assert.ok(
      location?.endsWith(expectedRedirect),
      `Expected ${path} to redirect to ${expectedRedirect}, got ${location}`
    );
  }

  // Public login routes return 200 OK
  const thLogin = await fetch('http://localhost:3000/th/login');
  assert.equal(thLogin.status, 200);

  const enLogin = await fetch('http://localhost:3000/en/login');
  assert.equal(enLogin.status, 200);

  // Invalid locales return 404
  const invalidLogin = await fetch('http://localhost:3000/fr/login');
  assert.equal(invalidLogin.status, 404, 'Invalid locale /fr/login must return 404');

  // Callback without code redirects to login
  const callbackRes = await fetch('http://localhost:3000/th/auth/callback', {
    redirect: 'manual',
  });
  assert.equal(callbackRes.status, 307);
  assert.ok(
    callbackRes.headers.get('location')?.includes('/th/login'),
    'Callback without code must redirect to /th/login'
  );
});
