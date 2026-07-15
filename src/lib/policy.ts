/**
 * Current privacy policy / terms version. Bump this string whenever the
 * policy or terms materially change; users who consented to an older
 * version will be re-gated at sign-in until they consent to the new one.
 *
 * Kept in sync manually with `POLICY_VERSION` in `convex/consent.ts` —
 * Convex functions can't import from outside `convex/` cleanly, so the
 * value is duplicated there rather than imported.
 */
export const POLICY_VERSION = '2026-07-15';

/**
 * The published policy pages, served by the web app (app/privacy.tsx,
 * app/terms.tsx). The in-app consent gate and the Google OAuth consent screen
 * both link here. The content lives in `src/legal/content.ts`.
 */
export const PRIVACY_POLICY_URL = 'https://ob.lizzardd.link/privacy';
export const TERMS_URL = 'https://ob.lizzardd.link/terms';
