import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

const testCookieStore = new Map<string, { value: string; options?: unknown }>();

export function getTestCookieStore() {
  return testCookieStore;
}

export function clearTestCookies() {
  testCookieStore.clear();
}

export async function createClient() {
  let cookieStore: CookieStore | null = null;

  try {
    cookieStore = await cookies();
  } catch {
    // Outside request scope (e.g. testing environments)
    cookieStore = null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        if (cookieStore) {
          return cookieStore.getAll();
        }
        return Array.from(testCookieStore.entries()).map(([name, item]) => ({
          name,
          value: item.value,
        }));
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (cookieStore) {
              cookieStore.set(name, value, options);
            } else {
              testCookieStore.set(name, { value, options });
            }
          });
        } catch {
          // The setAll method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}
