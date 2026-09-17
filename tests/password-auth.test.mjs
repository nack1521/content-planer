import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { signInWithPasswordAction } from '../src/app/actions/auth.ts';
import { createClient, clearTestCookies } from '../src/utils/supabase/server.ts';

const EMAIL = 'password-owner@example.test';
const PASSWORD = 'synthetic-strong-password-123';
let admin;
let userId;

test.before(async () => {
  const status = spawnSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8' });
  assert.equal(status.status, 0, 'Local Supabase must be running');
  const config = JSON.parse(status.stdout);
  const url = config.API_URL || 'http://127.0.0.1:54321';
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'Auth test must stay local');

  process.env.NEXT_PUBLIC_SUPABASE_URL = url;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = config.PUBLISHABLE_KEY || config.ANON_KEY;
  process.env.ALLOWED_EMAILS = EMAIL;
  delete process.env.ALLOWED_EMAIL;
  admin = createAdminClient(url, config.SERVICE_ROLE_KEY);

  const created = await admin.auth.admin.createUser({ email: EMAIL, email_confirm: true });
  assert.equal(created.error, null);
  userId = created.data.user.id;
  const updated = await admin.auth.admin.updateUserById(userId, { password: PASSWORD });
  assert.equal(updated.error, null);
  assert.equal(updated.data.user.id, userId, 'Adding a password must preserve the existing user ID');
});

test.after(async () => {
  clearTestCookies();
  if (userId) await admin.auth.admin.deleteUser(userId);
});

test('password sign-in rejects unknown owners and wrong credentials without a session', async () => {
  clearTestCookies();
  assert.deepEqual(await signInWithPasswordAction('unknown@example.test', PASSWORD), {
    success: false, error: 'invalid_credentials',
  });
  assert.deepEqual(await signInWithPasswordAction(EMAIL, 'wrong-password'), {
    success: false, error: 'invalid_credentials',
  });
  const client = await createClient();
  const { data } = await client.auth.getUser();
  assert.equal(data.user, null);
});

test('password sign-in uses the existing user ID and session', async () => {
  clearTestCookies();
  const result = await signInWithPasswordAction(EMAIL.toUpperCase(), PASSWORD);
  assert.deepEqual(result, { success: true });
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  assert.equal(error, null);
  assert.equal(data.user?.id, userId);
  assert.equal(data.user?.email, EMAIL);
});

test('operator setup tool never accepts a password on the command line', () => {
  const result = spawnSync(process.execPath, [
    'scripts/set-owner-password.mjs', '--email', EMAIL, '--password', PASSWORD,
  ], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage:/);
  assert.ok(!result.stdout.includes(PASSWORD) && !result.stderr.includes(PASSWORD));
});
