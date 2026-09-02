// Public analytics key: pinned here intentionally (PostHog write-only, safe in client).
// DO NOT move it to a gitignored/.env file: any future backend trust boundary would
// be fake, and the key is visible to every client anyway. The host is hardcoded to
// eu.i.posthog.com (EU Cloud) — do not switch regions without a privacy review.
export const POSTHOG_PROJECT_KEY = 'phc_uNosHtYorbCNiHyJvmRuUowSf8p2wWr8hdkBb5HJso59';
export const POSTHOG_HOST = 'https://eu.i.posthog.com';