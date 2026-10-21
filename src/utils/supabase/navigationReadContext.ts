import { cache } from 'react';
import { AsyncLocalStorage } from 'node:async_hooks';
import { createClient } from '@/utils/supabase/server';

export interface NavigationReadContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string | null;
  error?: string | null;
}

/**
 * Creates an authenticated Supabase client and extracts the user ID
 * from verified claims for the current request.
 */
export async function createNavigationReadContext(): Promise<NavigationReadContext> {
  try {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

    if (claimsError) {
      return { supabase, userId: null, error: 'unauthorized' };
    }

    const userId = claimsData?.claims?.sub ?? null;
    if (!userId) {
      return { supabase, userId: null, error: 'unauthorized' };
    }

    return { supabase, userId, error: null };
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'digest' in err &&
      (err as { digest: string }).digest === 'DYNAMIC_SERVER_USAGE'
    ) {
      throw err;
    }
    return {
      supabase: null as unknown as Awaited<ReturnType<typeof createClient>>,
      userId: null,
      error: 'service_error',
    };
  }
}

/**
 * React.cache memoized version for React Server Component renders.
 * Scoped strictly to the lifetime of a single React server render request.
 */
export const getCachedNavigationReadContext = cache(createNavigationReadContext);

/**
 * AsyncLocalStorage for scoped single-request execution in server pages and tests.
 * Never persists across requests or shares data between concurrent operations.
 */
const readContextStorage = new AsyncLocalStorage<Promise<NavigationReadContext>>();

/**
 * Resolves the request-local read context:
 * 1. Checks AsyncLocalStorage if an explicit request context is active.
 * 2. Falls back to React.cache memoized context for React Server Components.
 */
export async function getNavigationReadContext(): Promise<NavigationReadContext> {
  const store = readContextStorage.getStore();
  if (store) {
    return store;
  }
  return getCachedNavigationReadContext();
}

/**
 * Runs a callback within an isolated request-scoped navigation read context.
 */
export function withNavigationReadContext<T>(
  contextPromise: Promise<NavigationReadContext>,
  fn: () => T
): T {
  return readContextStorage.run(contextPromise, fn);
}
