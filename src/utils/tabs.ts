/**
 * Computes the target tab index for W3C WAI-ARIA tablist roving focus navigation.
 * Handles ArrowRight, ArrowLeft, Home, and End keys.
 */
export function getNextTabIndex(
  currentIndex: number,
  totalTabs: number,
  key: string
): number | null {
  if (totalTabs <= 0) return null;
  switch (key) {
    case "ArrowRight":
      return (currentIndex + 1) % totalTabs;
    case "ArrowLeft":
      return (currentIndex - 1 + totalTabs) % totalTabs;
    case "Home":
      return 0;
    case "End":
      return totalTabs - 1;
    default:
      return null;
  }
}
