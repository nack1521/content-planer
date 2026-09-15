/**
 * Controller for modal focus transitions and lifecycle.
 * Encapsulates the rules:
 * - Opener element captured on mount; restored on unmount.
 * - Initial field (title) focused strictly once on mount.
 * - Mutating dirty state or typing characters does NOT re-trigger initial field focus.
 * - Opening discard dialog records the active editor control that initiated the close attempt.
 * - Cancelling discard restores focus to that initiating control.
 * - Confirming discard leaves focus restoration to modal unmount (restoring to opener).
 */

export interface FocusableElement {
  focus: () => void;
}

export class ModalFocusController {
  private openerElement: FocusableElement | null = null;
  private initiatingControl: FocusableElement | null = null;
  private initialFocusCount = 0;

  /**
   * Called strictly once when the modal mounts.
   */
  public handleMount(opener: FocusableElement | null, initialField: FocusableElement | null): void {
    this.openerElement = opener;
    if (initialField && this.initialFocusCount === 0) {
      initialField.focus();
      this.initialFocusCount++;
    }
  }

  /**
   * Called strictly once when the modal unmounts.
   */
  public handleUnmount(): void {
    if (this.openerElement) {
      this.openerElement.focus();
    }
  }

  /**
   * Called when a close attempt is initiated while dirty.
   */
  public handleRequestDiscard(currentActive: FocusableElement | null): void {
    this.initiatingControl = currentActive;
  }

  /**
   * Called when the user cancels the discard confirmation dialog.
   */
  public handleCancelDiscard(fallback: FocusableElement | null): void {
    if (this.initiatingControl) {
      this.initiatingControl.focus();
    } else if (fallback) {
      fallback.focus();
    }
  }

  /**
   * Called when the user confirms discarding changes.
   */
  public handleConfirmDiscard(): void {
    this.initiatingControl = null;
    // Unmount will handle restoring opener focus
  }

  /**
   * Simulates/records a change in form dirty state.
   * Guarantees that dirty state changes do NOT rerun initial focus.
   */
  public handleDirtyStateChange(): void {
    // Pure no-op: must not call initialField.focus()
  }

  public getInitialFocusCount(): number {
    return this.initialFocusCount;
  }

  public getOpenerElement(): FocusableElement | null {
    return this.openerElement;
  }

  public getInitiatingControl(): FocusableElement | null {
    return this.initiatingControl;
  }
}
