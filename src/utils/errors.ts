export function getLocalizedErrorMessage(
  t: (key: string) => string,
  errorCode?: string | null
): string {
  if (!errorCode) return t("errors.unknown");

  // If the error code matches a known translated code
  const key = `errors.${errorCode}`;
  const translated = t(key);
  if (translated && translated !== key) {
    return translated;
  }

  // If the error starts with validation_failed:
  if (errorCode.startsWith("validation_failed")) {
    return t("errors.validation_failed");
  }

  // Fallback to unknown or raw if already localized
  return t("errors.unknown");
}
