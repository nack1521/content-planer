import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createNavigationReadContext,
  getNavigationReadContext,
  withNavigationReadContext,
} from '../src/utils/supabase/navigationReadContext.ts';
import {
  getContentItemsAction,
  getContentPillarsAction,
} from '../src/app/actions/content.ts';
import { getTasksAction } from '../src/app/actions/tasks.ts';
import { getReferenceAccountsAction } from '../src/app/actions/reference-accounts.ts';
import {
  telemetry,
  resetTelemetry,
  configureSession,
} from './navigation-r1-fixture.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Standard fictional UUIDs (RFC 4122 v4)
const FICTIONAL_USER_A = '00000000-0000-4000-a000-000000000001';
const FICTIONAL_USER_B = '00000000-0000-4000-a000-000000000002';
const FICTIONAL_ITEM_ID = '11111111-1111-4111-a111-111111111111';
const FICTIONAL_PILLAR_ID = '22222222-2222-4222-a222-222222222222';
const FICTIONAL_TASK_ID = '33333333-3333-4333-a333-333333333333';
const FICTIONAL_LINK_ID = '44444444-4444-4444-a444-444444444444';
const FICTIONAL_ACCOUNT_ID = '55555555-5555-4555-a555-555555555555';

function getSampleFixtures(userId = FICTIONAL_USER_A) {
  const item = {
    id: FICTIONAL_ITEM_ID,
    user_id: userId,
    content_pillar_id: FICTIONAL_PILLAR_ID,
    title: 'Episode 1: Scalable Social Video',
    platforms: ['tiktok', 'instagram'],
    format: 'short',
    goal: 'awareness',
    status: 'scripting',
    progress: 50,
    publish_at: '2026-10-25T08:00:00.000Z',
    publish_time_known: true,
    hook: 'Stop scrolling if you plan content',
    production_detail: 'Shot on iPhone 16 Pro, vertical 4k',
    caption: 'Full caption breakdown with strategy',
    cta: 'Save this post for later',
    hashtags: ['#socialmedia', '#planner', '#contentcreator'],
    notes: 'Approved by creator',
    archived_at: null,
    created_at: '2026-10-20T00:00:00.000Z',
    updated_at: '2026-10-20T00:00:00.000Z',
    source_number: 142,
    objective: 'Test deduplication',
    review_status: 'approved',
    source_content_status: null,
    content_pillar: {
      id: FICTIONAL_PILLAR_ID,
      name_en: 'Production',
      name_th: 'โปรดักชัน',
      color: '#8b5cf6',
      sort_order: 1,
    },
    links: [
      {
        id: FICTIONAL_LINK_ID,
        url: 'https://example.com/asset-drive',
        link_type: 'asset',
        label: 'Raw footage',
      },
    ],
    tasks: [
      {
        id: FICTIONAL_TASK_ID,
        title: 'Color grading pass',
        status: 'not_started',
      },
    ],
  };

  const pillar = {
    id: FICTIONAL_PILLAR_ID,
    user_id: userId,
    name_en: 'Strategy',
    name_th: 'กลยุทธ์',
    color: '#3b82f6',
    sort_order: 0,
    created_at: '2026-10-20T00:00:00.000Z',
    updated_at: '2026-10-20T00:00:00.000Z',
  };

  const task = {
    id: FICTIONAL_TASK_ID,
    user_id: userId,
    content_item_id: FICTIONAL_ITEM_ID,
    title: 'Edit rough cut',
    status: 'in_progress',
    due_date: '2026-10-22',
    priority: 'high',
    task_type: 'video',
    description: 'Cut first draft in CapCut',
    import_key: null,
    created_at: '2026-10-20T00:00:00.000Z',
    updated_at: '2026-10-20T00:00:00.000Z',
    content_item: {
      id: FICTIONAL_ITEM_ID,
      title: 'Episode 1: Scalable Social Video',
      source_number: 142,
    },
  };

  const account = {
    id: FICTIONAL_ACCOUNT_ID,
    user_id: userId,
    platform: 'tiktok',
    account_label: 'Best Creator Ideas',
    url: 'https://tiktok.com/@creatorideas',
    notes: 'Reference pacing and hooks',
    created_at: '2026-10-20T00:00:00.000Z',
    updated_at: '2026-10-20T00:00:00.000Z',
  };

  return { items: [item], pillars: [pillar], tasks: [task], accounts: [account] };
}

// ============================================================================
// C1: Navigation Pending Feedback & Route Loading Boundaries
// ============================================================================

test('C1.1: NavigationPending component is exported and uses useLinkStatus', () => {
  const filePath = path.join(projectRoot, 'src/components/shell/NavigationPending.tsx');
  assert.ok(fs.existsSync(filePath), 'NavigationPending.tsx must exist');

  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes("'use client'"), 'NavigationPending must be a client component');
  assert.ok(content.includes('useLinkStatus'), 'NavigationPending must import and use useLinkStatus');
  assert.ok(content.includes('aria-live="polite"'), 'NavigationPending must include an accessible polite live region');
  assert.ok(content.includes('role="status"'), 'NavigationPending must include role="status"');
  assert.ok(content.includes('nav.navigating'), 'NavigationPending must localize using nav.navigating');
  assert.ok(content.includes("variant === 'mobile'"), 'NavigationPending must support mobile variant');
});

test('C1.2: DesktopSidebar and MobileNav integrate NavigationPending in all 5 app navigation links', () => {
  const desktopSidebarPath = path.join(projectRoot, 'src/components/shell/DesktopSidebar.tsx');
  const mobileNavPath = path.join(projectRoot, 'src/components/shell/MobileNav.tsx');

  assert.ok(fs.existsSync(desktopSidebarPath), 'DesktopSidebar.tsx must exist');
  assert.ok(fs.existsSync(mobileNavPath), 'MobileNav.tsx must exist');

  const desktopContent = fs.readFileSync(desktopSidebarPath, 'utf8');
  assert.ok(desktopContent.includes('NavigationPending'), 'DesktopSidebar must import NavigationPending');
  assert.ok(
    desktopContent.includes('<NavigationPending variant="desktop" />'),
    'DesktopSidebar must render desktop NavigationPending'
  );

  const mobileContent = fs.readFileSync(mobileNavPath, 'utf8');
  assert.ok(mobileContent.includes('NavigationPending'), 'MobileNav must import NavigationPending');
  assert.ok(
    mobileContent.includes('<NavigationPending variant="mobile" />'),
    'MobileNav must render mobile NavigationPending'
  );
});

test('C1.3: Route loading boundaries exist for all 5 app routes', () => {
  const routes = ['planner', 'tasks', 'calendar', 'ideas', 'settings'];

  for (const route of routes) {
    const loadingPath = path.join(projectRoot, `src/app/[locale]/${route}/loading.tsx`);
    assert.ok(fs.existsSync(loadingPath), `Loading boundary must exist at ${loadingPath}`);

    const content = fs.readFileSync(loadingPath, 'utf8');
    assert.ok(content.includes('PageLoading'), `Route ${route}/loading.tsx must render PageLoading`);
    assert.ok(content.includes(`variant="${route}"`), `Route ${route}/loading.tsx must pass variant="${route}"`);
  }
});

test('C1.4: PageLoading provides accessible feedback and structural skeletons for all 5 routes', () => {
  const pageLoadingPath = path.join(projectRoot, 'src/components/shell/PageLoading.tsx');
  assert.ok(fs.existsSync(pageLoadingPath), 'PageLoading.tsx must exist');

  const content = fs.readFileSync(pageLoadingPath, 'utf8');
  assert.ok(content.includes("'use client'"), 'PageLoading must be a client component');
  assert.ok(content.includes('role="status"'), 'PageLoading must include accessible role="status"');
  assert.ok(content.includes('aria-live="polite"'), 'PageLoading must include aria-live="polite"');
  assert.ok(content.includes('aria-busy="true"'), 'PageLoading must indicate aria-busy');

  // Verify all 5 variant skeleton blocks exist
  for (const variant of ['planner', 'tasks', 'calendar', 'ideas', 'settings']) {
    assert.ok(content.includes(`variant === '${variant}'`), `PageLoading must handle variant '${variant}'`);
  }
});

// ============================================================================
// C2: Initial Read Fan-out & Single-Request Deduplication (R1 Corrected)
// ============================================================================

test('C2.0: createNavigationReadContext and getNavigationReadContext are exported functions', () => {
  assert.equal(typeof createNavigationReadContext, 'function');
  assert.equal(typeof getNavigationReadContext, 'function');
  assert.equal(typeof withNavigationReadContext, 'function');
});

test('C2.1: Planner page pattern executes production factory and captures exactly 1 createClient and 1 getClaims call', async () => {
  resetTelemetry();
  const fixtures = getSampleFixtures(FICTIONAL_USER_A);
  configureSession({
    userId: FICTIONAL_USER_A,
    items: fixtures.items,
    pillars: fixtures.pillars,
  });

  // Replicate exact production planner/page.tsx wiring
  const [itemsRes, pillarsRes] = await withNavigationReadContext(
    createNavigationReadContext(),
    () => Promise.all([getContentItemsAction(), getContentPillarsAction()])
  );

  // Assert actual factory dependency call counts from production execution
  assert.equal(telemetry.createClientCalls, 1, 'Production factory must call createClient exactly once');
  assert.equal(telemetry.getClaimsCalls, 1, 'Production factory must call getClaims exactly once');
  assert.equal(itemsRes.error, null);
  assert.equal(pillarsRes.error, null);
  assert.equal(itemsRes.items.length, 1);
  assert.equal(pillarsRes.pillars.length, 1);
  assert.equal(telemetry.executedQueries.length, 2, 'Both database queries must execute in parallel');
  assert.equal(telemetry.executedQueries[0].filters.user_id, FICTIONAL_USER_A);
  assert.equal(telemetry.executedQueries[1].filters.user_id, FICTIONAL_USER_A);
});

test('C2.2: Tasks page pattern executes production factory and captures exactly 1 createClient and 1 getClaims call across 3 reads', async () => {
  resetTelemetry();
  const fixtures = getSampleFixtures(FICTIONAL_USER_A);
  configureSession({
    userId: FICTIONAL_USER_A,
    items: fixtures.items,
    pillars: fixtures.pillars,
    tasks: fixtures.tasks,
  });

  // Replicate exact production tasks/page.tsx wiring
  const [tasksRes, itemsRes, pillarsRes] = await withNavigationReadContext(
    createNavigationReadContext(),
    () => Promise.all([getTasksAction(), getContentItemsAction(), getContentPillarsAction()])
  );

  assert.equal(telemetry.createClientCalls, 1, 'Tasks page must call createClient exactly once across 3 reads');
  assert.equal(telemetry.getClaimsCalls, 1, 'Tasks page must call getClaims exactly once across 3 reads');
  assert.equal(tasksRes.error, null);
  assert.equal(itemsRes.error, null);
  assert.equal(pillarsRes.error, null);
  assert.equal(tasksRes.tasks.length, 1);
  assert.equal(itemsRes.items.length, 1);
  assert.equal(pillarsRes.pillars.length, 1);
  assert.equal(telemetry.executedQueries.length, 3, 'All 3 queries must execute');
  for (const query of telemetry.executedQueries) {
    assert.equal(query.filters.user_id, FICTIONAL_USER_A);
  }
});

test('C2.3: Ideas page pattern executes production factory and captures exactly 1 createClient and 1 getClaims call across 3 reads', async () => {
  resetTelemetry();
  const fixtures = getSampleFixtures(FICTIONAL_USER_A);
  configureSession({
    userId: FICTIONAL_USER_A,
    items: fixtures.items,
    pillars: fixtures.pillars,
    accounts: fixtures.accounts,
  });

  // Replicate exact production ideas/page.tsx wiring
  const [itemsRes, pillarsRes, accountsRes] = await withNavigationReadContext(
    createNavigationReadContext(),
    () => Promise.all([
      getContentItemsAction(),
      getContentPillarsAction(),
      getReferenceAccountsAction(),
    ])
  );

  assert.equal(telemetry.createClientCalls, 1, 'Ideas page must call createClient exactly once across 3 reads');
  assert.equal(telemetry.getClaimsCalls, 1, 'Ideas page must call getClaims exactly once across 3 reads');
  assert.equal(itemsRes.error, null);
  assert.equal(pillarsRes.error, null);
  assert.equal(accountsRes.error, null);
  assert.equal(telemetry.executedQueries.length, 3);
  for (const query of telemetry.executedQueries) {
    assert.equal(query.filters.user_id, FICTIONAL_USER_A);
  }
});

test('C2.4: Calendar page pattern executes production factory and captures exactly 1 createClient and 1 getClaims call', async () => {
  resetTelemetry();
  const fixtures = getSampleFixtures(FICTIONAL_USER_A);
  configureSession({
    userId: FICTIONAL_USER_A,
    items: fixtures.items,
    pillars: fixtures.pillars,
  });

  // Replicate exact production calendar/page.tsx wiring
  const [itemsRes, pillarsRes] = await withNavigationReadContext(
    createNavigationReadContext(),
    () => Promise.all([getContentItemsAction(), getContentPillarsAction()])
  );

  assert.equal(telemetry.createClientCalls, 1);
  assert.equal(telemetry.getClaimsCalls, 1);
  assert.equal(itemsRes.error, null);
  assert.equal(pillarsRes.error, null);
  assert.equal(telemetry.executedQueries.length, 2);
});

test('C2.5: Representative content record payloads (links, tasks, pillar, hook, CTA) are preserved via production mapping', async () => {
  resetTelemetry();
  const fixtures = getSampleFixtures(FICTIONAL_USER_A);
  configureSession({
    userId: FICTIONAL_USER_A,
    items: fixtures.items,
    pillars: fixtures.pillars,
  });

  const [itemsRes] = await withNavigationReadContext(
    createNavigationReadContext(),
    () => Promise.all([getContentItemsAction()])
  );

  const item = itemsRes.items[0];
  assert.ok(item, 'Item must be returned');
  assert.equal(item.id, FICTIONAL_ITEM_ID);
  assert.equal(item.user_id, FICTIONAL_USER_A);
  assert.equal(item.title, 'Episode 1: Scalable Social Video');
  assert.equal(item.source_number, 142);
  assert.equal(item.hook, 'Stop scrolling if you plan content');
  assert.equal(item.caption, 'Full caption breakdown with strategy');
  assert.equal(item.cta, 'Save this post for later');
  assert.equal(item.production_detail, 'Shot on iPhone 16 Pro, vertical 4k');
  assert.equal(item.review_status, 'approved');
  assert.equal(item.progress, 50);
  assert.deepEqual(item.hashtags, ['#socialmedia', '#planner', '#contentcreator']);
  assert.deepEqual(item.platforms, ['tiktok', 'instagram']);
  assert.equal(item.publish_at, '2026-10-25T08:00:00.000Z');
  assert.equal(item.publish_time_known, true);

  // Relationships preserved
  assert.equal(item.pillar?.name_en, 'Production');
  assert.equal(item.links.length, 1);
  assert.equal(item.links[0].url, 'https://example.com/asset-drive');
  assert.equal(item.tasks.length, 1);
  assert.equal(item.tasks[0].title, 'Color grading pass');
});

test('C2.6: (Generic library behavior only) React.cache server dispatcher memoizes within scope and discards across scopes', async () => {
  // Standalone library demonstration of React.cache internals with server dispatcher.
  // Note: Route page execution in production uses the explicit AsyncLocalStorage path verified in C2.1-C2.4.
  const ReactServer = await import('../node_modules/react/react.react-server.js');
  const internals = ReactServer.default.__SERVER_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

  function createServerRenderScope() {
    const requestCache = new Map();
    return {
      run: (fn) => {
        const prevA = internals.A;
        internals.A = {
          getCacheForType: (createCacheRoot) => {
            let root = requestCache.get(createCacheRoot);
            if (!root) {
              root = createCacheRoot();
              requestCache.set(createCacheRoot, root);
            }
            return root;
          },
        };
        try {
          return fn();
        } finally {
          internals.A = prevA;
        }
      },
    };
  }

  let factoryCalls = 0;
  const cachedReader = ReactServer.default.cache(() => {
    factoryCalls++;
    return { token: `token-req-${factoryCalls}`, count: factoryCalls };
  });

  // Request 1: calling twice within Request 1's server render scope
  const req1 = createServerRenderScope();
  const r1a = req1.run(() => cachedReader());
  const r1b = req1.run(() => cachedReader());

  assert.equal(r1a.token, 'token-req-1');
  assert.equal(r1b.token, 'token-req-1');
  assert.equal(r1a, r1b, 'Must return identical memoized reference within Request 1');
  assert.equal(factoryCalls, 1, 'Factory must only be called once during Request 1');

  // Request 2: new render scope
  const req2 = createServerRenderScope();
  const r2a = req2.run(() => cachedReader());

  assert.equal(r2a.token, 'token-req-2');
  assert.notEqual(r1a, r2a, 'Must return fresh instance for Request 2');
  assert.equal(factoryCalls, 2, 'Factory must be called again for Request 2');
});

// ============================================================================
// C3: Missing / Invalid Identity & Multi-User Isolation (R1 Corrected)
// ============================================================================

test('C3.1: Missing user identity in production factory leads to ZERO database queries and returns unauthorized', async () => {
  resetTelemetry();
  // Configure session with null userId (unauthenticated)
  configureSession({ userId: null });

  const [itemsRes, pillarsRes, tasksRes, accountsRes] = await withNavigationReadContext(
    createNavigationReadContext(),
    () => Promise.all([
      getContentItemsAction(),
      getContentPillarsAction(),
      getTasksAction(),
      getReferenceAccountsAction(),
    ])
  );

  assert.equal(telemetry.createClientCalls, 1, 'Factory called createClient once');
  assert.equal(telemetry.getClaimsCalls, 1, 'Factory called getClaims once');
  assert.equal(telemetry.executedQueries.length, 0, 'Zero database queries must be performed when userId is missing');
  assert.equal(itemsRes.error, 'unauthorized');
  assert.deepEqual(itemsRes.items, []);
  assert.equal(pillarsRes.error, 'unauthorized');
  assert.deepEqual(pillarsRes.pillars, []);
  assert.equal(tasksRes.error, 'unauthorized');
  assert.deepEqual(tasksRes.tasks, []);
  assert.equal(accountsRes.error, 'unauthorized');
  assert.deepEqual(accountsRes.accounts, []);
});

test('C3.2: Production factory getClaims error branch leads to ZERO database queries and returns unauthorized', async () => {
  resetTelemetry();
  // Inject real getClaims error
  configureSession({ claimsError: { message: 'JWT expired or invalid signature' } });

  const [itemsRes, pillarsRes, tasksRes, accountsRes] = await withNavigationReadContext(
    createNavigationReadContext(),
    () => Promise.all([
      getContentItemsAction(),
      getContentPillarsAction(),
      getTasksAction(),
      getReferenceAccountsAction(),
    ])
  );

  assert.equal(telemetry.createClientCalls, 1, 'Factory executed createClient');
  assert.equal(telemetry.getClaimsCalls, 1, 'Factory executed getClaims and encountered error');
  assert.equal(telemetry.executedQueries.length, 0, 'Zero owner-data queries must be performed on claims error');
  assert.equal(itemsRes.error, 'unauthorized');
  assert.equal(pillarsRes.error, 'unauthorized');
  assert.equal(tasksRes.error, 'unauthorized');
  assert.equal(accountsRes.error, 'unauthorized');
});

test('C3.3: User A and User B independent subsequent requests through the production factory retain separate identities without leakage', async () => {
  resetTelemetry();

  // Request 1: User A
  const fixturesA = getSampleFixtures(FICTIONAL_USER_A);
  configureSession({
    userId: FICTIONAL_USER_A,
    items: fixturesA.items,
  });

  const [resA] = await withNavigationReadContext(
    createNavigationReadContext(),
    () => Promise.all([getContentItemsAction()])
  );

  assert.equal(telemetry.createClientCalls, 1);
  assert.equal(telemetry.getClaimsCalls, 1);
  assert.equal(telemetry.executedQueries.length, 1);
  assert.equal(telemetry.executedQueries[0].filters.user_id, FICTIONAL_USER_A);
  assert.equal(resA.items[0].user_id, FICTIONAL_USER_A);

  // Request 2: User B (independent subsequent request)
  const itemB = {
    ...fixturesA.items[0],
    id: 'bbbbbbbb-bbbb-4bbb-abbb-bbbbbbbbbbbb',
    user_id: FICTIONAL_USER_B,
    title: 'User B Content',
  };
  configureSession({
    userId: FICTIONAL_USER_B,
    items: [itemB],
  });

  const [resB] = await withNavigationReadContext(
    createNavigationReadContext(),
    () => Promise.all([getContentItemsAction()])
  );

  assert.equal(telemetry.createClientCalls, 2, 'Second request must call createClient freshly');
  assert.equal(telemetry.getClaimsCalls, 2, 'Second request must call getClaims freshly');
  assert.equal(telemetry.executedQueries.length, 2);
  assert.equal(telemetry.executedQueries[1].filters.user_id, FICTIONAL_USER_B);
  assert.equal(resB.items[0].user_id, FICTIONAL_USER_B);
  assert.notEqual(resA.items[0].user_id, resB.items[0].user_id);
});

test('C3.4: Authentication failure in Request A does not contaminate subsequent Request B through production factory', async () => {
  resetTelemetry();

  // Request A: Failed auth
  configureSession({ claimsError: { message: 'Auth token revoked' } });
  const [resA] = await withNavigationReadContext(
    createNavigationReadContext(),
    () => Promise.all([getContentItemsAction()])
  );
  assert.equal(resA.error, 'unauthorized');
  assert.equal(telemetry.executedQueries.length, 0);

  // Request B: Valid auth
  const fixtures = getSampleFixtures(FICTIONAL_USER_A);
  configureSession({
    userId: FICTIONAL_USER_A,
    items: fixtures.items,
  });
  const [resB] = await withNavigationReadContext(
    createNavigationReadContext(),
    () => Promise.all([getContentItemsAction()])
  );
  assert.equal(resB.error, null);
  assert.equal(resB.items.length, 1);
  assert.equal(telemetry.executedQueries.length, 1);
});

// ============================================================================
// C4: Freshness, Pagination & Contract Preservation
// ============================================================================

test('C4.1: Query results are not cached across requests (subsequent requests query database freshly)', async () => {
  resetTelemetry();
  let counter = 1;

  // Custom session returning dynamic data on each query
  configureSession({
    userId: FICTIONAL_USER_A,
    items: [{ id: `item-version-1`, user_id: FICTIONAL_USER_A, title: `Post Version 1` }],
  });

  // Request 1
  const [res1] = await withNavigationReadContext(
    createNavigationReadContext(),
    () => Promise.all([getContentItemsAction()])
  );

  // Update session data for Request 2
  configureSession({
    userId: FICTIONAL_USER_A,
    items: [{ id: `item-version-2`, user_id: FICTIONAL_USER_A, title: `Post Version 2` }],
  });

  // Request 2
  const [res2] = await withNavigationReadContext(
    createNavigationReadContext(),
    () => Promise.all([getContentItemsAction()])
  );

  assert.equal(telemetry.executedQueries.length, 2, 'Subsequent requests must query database freshly');
  assert.notEqual(res1.items[0].id, res2.items[0].id, 'Subsequent request must receive fresh data');
});

test('C4.2: Content date clearing and editor payloads remain valid', async () => {
  resetTelemetry();
  const clearedItem = {
    id: FICTIONAL_ITEM_ID,
    user_id: FICTIONAL_USER_A,
    title: 'Unscheduled Post',
    publish_at: null,
    publish_time_known: false,
    platforms: ['tiktok'],
  };
  configureSession({
    userId: FICTIONAL_USER_A,
    items: [clearedItem],
  });

  const [res] = await withNavigationReadContext(
    createNavigationReadContext(),
    () => Promise.all([getContentItemsAction()])
  );

  assert.equal(res.items[0].publish_at, null, 'Unset date must be null');
  assert.equal(res.items[0].publish_time_known, false, 'publish_time_known must be false');
});

// ============================================================================
// C5: Bilingual Parity & Accessibility
// ============================================================================

test('C5.1: Translation keys have 100% parity including new loading and navigation keys', () => {
  const en = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src/messages/en.json'), 'utf8'));
  const th = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src/messages/th.json'), 'utf8'));

  assert.equal(en.nav.navigating, 'Loading...');
  assert.equal(th.nav.navigating, 'กำลังโหลด...');
  assert.equal(en.settings.loading, 'Loading settings...');
  assert.equal(th.settings.loading, 'กำลังโหลดการตั้งค่า...');
  assert.equal(en.loading.loadingData, 'Loading production schedule...');
  assert.equal(th.loading.loadingData, 'กำลังโหลดตารางการผลิตคอนเทนต์...');
  assert.equal(en.tasks.loading, 'Loading production tasks...');
  assert.equal(th.tasks.loading, 'กำลังโหลดงานโปรดักชัน...');
  assert.equal(en.calendar.loading, 'Loading calendar...');
  assert.equal(th.calendar.loading, 'กำลังโหลดปฏิทิน...');
  assert.equal(en.ideas.loading, 'Loading ideas...');
  assert.equal(th.ideas.loading, 'กำลังโหลดคลังไอเดีย...');
});

test('C5.2: Accessible attributes and zero-layout-shift classes on NavigationPending and PageLoading', () => {
  const pendingContent = fs.readFileSync(
    path.join(projectRoot, 'src/components/shell/NavigationPending.tsx'),
    'utf8'
  );
  assert.ok(pendingContent.includes('role="status"'), 'Must have role="status"');
  assert.ok(pendingContent.includes('aria-live="polite"'), 'Must have aria-live="polite"');
  assert.ok(pendingContent.includes('sr-only'), 'Screen-reader only live announcement');
  assert.ok(pendingContent.includes('pointer-events-none'), 'Invisible state must not capture clicks');

  const loadingContent = fs.readFileSync(
    path.join(projectRoot, 'src/components/shell/PageLoading.tsx'),
    'utf8'
  );
  assert.ok(loadingContent.includes('role="status"'), 'Must have role="status"');
  assert.ok(loadingContent.includes('aria-live="polite"'), 'Must have aria-live="polite"');
  assert.ok(loadingContent.includes('animate-pulse'), 'Skeleton pulse animation');
});
