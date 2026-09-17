
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/headers") {
    return nextResolve("next/headers.js", context);
  }
  if (specifier === "next/cache") {
    return nextResolve("next/cache.js", context);
  }
  if (specifier === "next/navigation") {
    return nextResolve("next/navigation.js", context);
  }
  if (specifier.startsWith("@/")) {
    const p = specifier.replace("@/", "./src/");
    return nextResolve(new URL(p.endsWith(".ts") || p.endsWith(".tsx") ? p : p + ".ts", "file://" + process.cwd() + "/").href, context);
  }
  return nextResolve(specifier, context);
}
