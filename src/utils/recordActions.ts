/**
 * Safe action executor for async record operations (save, delete, duplicate, archive).
 * Ensures error catching, prevents unhandled promise rejections, and invokes callbacks.
 */

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
    const rawMsg = err instanceof Error ? err.message : 'save_failed';
    onError(rawMsg);
    return false;
  }
}
