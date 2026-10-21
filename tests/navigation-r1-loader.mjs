const fixtureUrl = new URL('./navigation-r1-fixture.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (
    specifier === '@/utils/supabase/server' ||
    specifier === '@/utils/supabase/server.ts' ||
    specifier.endsWith('/src/utils/supabase/server.ts') ||
    specifier.endsWith('/src/utils/supabase/server')
  ) {
    return {
      format: 'module',
      shortCircuit: true,
      url: fixtureUrl,
    };
  }
  return nextResolve(specifier, context);
}
