/**
 * Safe action executor for async record operations (save, delete, duplicate, archive).
 * Ensures error catching, prevents unhandled promise rejections, and invokes callbacks.
 */

export function extractErrorCode(err: unknown, defaultFallback = 'save_failed'): string {
  if (err instanceof Error && err.message && err.message.trim()) {
    return err.message.trim();
  }
  if (typeof err === 'string' && err.trim()) {
    return err.trim();
  }
  if (err && typeof err === 'object' && 'error' in err && typeof (err as { error: unknown }).error === 'string') {
    return ((err as { error: string }).error).trim();
  }
  return defaultFallback;
}

export async function executeRecordAction<T>(
  action: () => Promise<T>,
  onSuccess: (result: T) => void,
  onError: (rawErrorCode: string) => void
): Promise<boolean> {
  try {
    const result = await action();
    onSuccess(result);
    return true;
  } catch (err: unknown) {
    const rawMsg = extractErrorCode(err, 'save_failed');
    onError(rawMsg);
    return false;
  }
}
