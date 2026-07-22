/**
 * Human-review gate for the scope-completeness warning (see scope-completeness.ts).
 *
 * Today that warning is only a banner on the proposal page — nothing stops a
 * proposal flagged as likely-incomplete from being emailed to the client. This
 * turns the warning into an actual gate: sending is blocked until either the
 * scope is fixed (missing list goes empty on regeneration) or a human
 * explicitly acknowledges it, which is recorded as a review event.
 */

export interface StoredScopeCheck {
  missing?: string[] | null;
  message?: string | null;
  acknowledged_at?: string | null;
}

/** True when the send action must be blocked until the human explicitly acknowledges. */
export function scopeReviewBlocksSend(
  scopeCheck: StoredScopeCheck | null | undefined,
  acknowledge: boolean,
): boolean {
  if (!scopeCheck?.missing?.length) return false;
  if (scopeCheck.acknowledged_at) return false;
  return !acknowledge;
}

/** Returns the scope_check object to persist, stamped with the review event when acknowledged. */
export function withScopeReviewAcknowledged(
  scopeCheck: StoredScopeCheck | null | undefined,
  acknowledge: boolean,
): StoredScopeCheck | null | undefined {
  if (!scopeCheck?.missing?.length || scopeCheck.acknowledged_at || !acknowledge) return scopeCheck;
  return { ...scopeCheck, acknowledged_at: new Date().toISOString() };
}
