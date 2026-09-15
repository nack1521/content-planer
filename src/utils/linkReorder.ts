/**
 * Pure functions for moving items up and down in an array with boundary clamping.
 */

export function moveItemUp<T>(items: readonly T[], index: number): T[] {
  if (index <= 0 || index >= items.length) {
    return [...items];
  }
  const copy = [...items];
  const temp = copy[index - 1];
  copy[index - 1] = copy[index];
  copy[index] = temp;
  return copy;
}

export function moveItemDown<T>(items: readonly T[], index: number): T[] {
  if (index < 0 || index >= items.length - 1) {
    return [...items];
  }
  const copy = [...items];
  const temp = copy[index + 1];
  copy[index + 1] = copy[index];
  copy[index] = temp;
  return copy;
}
