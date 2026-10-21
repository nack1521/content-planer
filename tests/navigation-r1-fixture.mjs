// Synthetic isolated Supabase client fixture for CP-PERF-01-R1
// Completely isolated: no network, no database, no real credentials.

export const telemetry = {
  createClientCalls: 0,
  getClaimsCalls: 0,
  executedQueries: [],
};

export function resetTelemetry() {
  telemetry.createClientCalls = 0;
  telemetry.getClaimsCalls = 0;
  telemetry.executedQueries.length = 0;
}

let activeSession = {
  userId: '00000000-0000-4000-a000-000000000001',
  claimsError: null,
  items: [],
  pillars: [],
  tasks: [],
  accounts: [],
};

export function configureSession(config = {}) {
  activeSession = {
    userId: config.userId !== undefined ? config.userId : '00000000-0000-4000-a000-000000000001',
    claimsError: config.claimsError || null,
    items: config.items || [],
    pillars: config.pillars || [],
    tasks: config.tasks || [],
    accounts: config.accounts || [],
  };
}

export function getActiveSession() {
  return activeSession;
}

// Helpers for test cookie compatibility with src/utils/supabase/server.ts
const cookieStore = new Map();
export function getTestCookieStore() {
  return cookieStore;
}
export function clearTestCookies() {
  cookieStore.clear();
}

/**
 * Synthetic createClient implementation substituting @/utils/supabase/server in R1 tests.
 */
export async function createClient() {
  telemetry.createClientCalls++;

  const client = {
    auth: {
      getClaims: async () => {
        telemetry.getClaimsCalls++;
        if (activeSession.claimsError) {
          return { data: null, error: activeSession.claimsError };
        }
        if (!activeSession.userId) {
          return { data: { claims: {} }, error: null };
        }
        return {
          data: {
            claims: {
              sub: activeSession.userId,
            },
          },
          error: null,
        };
      },
    },
    from: (tableName) => {
      const queryEntry = {
        table: tableName,
        filters: {},
      };
      telemetry.executedQueries.push(queryEntry);

      let rowsToReturn = [];
      if (tableName === 'content_items') {
        rowsToReturn = activeSession.items;
      } else if (tableName === 'content_pillars') {
        rowsToReturn = activeSession.pillars;
      } else if (tableName === 'production_tasks') {
        rowsToReturn = activeSession.tasks;
      } else if (tableName === 'reference_accounts') {
        rowsToReturn = activeSession.accounts;
      }

      const builder = {
        select: (_cols) => builder,
        eq: (field, val) => {
          queryEntry.filters[field] = val;
          return builder;
        },
        is: (field, val) => {
          queryEntry.filters[field] = val;
          return builder;
        },
        order: (_field, _opts) => {
          // Terminal call in all read actions
          return Promise.resolve({
            data: rowsToReturn,
            error: null,
          });
        },
      };

      return builder;
    },
  };

  return client;
}
