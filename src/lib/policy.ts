/**
 * Current privacy policy / terms version. Bump this string whenever the
 * policy or terms materially change; users who consented to an older
 * version will be re-gated at sign-in until they consent to the new one.
 *
 * Kept in sync manually with `POLICY_VERSION` in `convex/consent.ts` —
 * Convex functions can't import from outside `convex/` cleanly, so the
 * value is duplicated there rather than imported.
 */
export const POLICY_VERSION = '2026-07-09';

/** Placeholder policy links — real copy/URLs are a separate legal process item. */
export const PRIVACY_POLICY_URL = 'https://ourbudget.app/privacy';
export const TERMS_URL = 'https://ourbudget.app/terms';
