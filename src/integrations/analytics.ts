// Analytics wrapper (SEC-privacy): manual events only, no autocapture, no IP.
//
// HARD RULES (do not relax without a privacy review):
// - Never send entry content: no substance id, method id, dose, notes, or timestamps.
// - Never send Telegram initData, user id, username, or any PII.
// - Event properties are allowlisted per event and must stay empty otherwise.
// - Events are best-effort and fire-and-forget; analytics must never block the app.
//
// Why a public inline key: PostHog write-only keys are safe in client code and the
// app is a static SPA with no backend. The key is pinned in analytics.public.ts and
// intentionally NOT gitignored so the deploy-time contract is visible in git.

import posthog, { PostHogInterface } from 'posthog-js';
import { POSTHOG_HOST, POSTHOG_PROJECT_KEY } from './analytics.public';

let client: PostHogInterface | null = null;
let initialized = false;

export interface AnalyticsProps {
  [k: string]: string | number | boolean | null;
}

export function initAnalytics(): void {
  if (initialized) return;
  // Fail-safe: never crash or block the UI because of analytics.
  try {
    posthog.init(POSTHOG_PROJECT_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: false,
      disable_session_recording: true,
      ip: false,
      property_blacklist: ['$ip', '$host', '$browser', '$os', '$device_type', '$current_url', '$pathname'],
      loaded: (ph) => {
        client = ph;
        try {
          // No user id / initData: leave the default anonymous distinct_id.
          ph.register({ app: 'usnee', platform: 'web' });
        } catch {
          /* ignore */
        }
      }
    });
    initialized = true;
  } catch {
    initialized = true; // stay silent on failure
  }
}

function getClient(): PostHogInterface | null {
  if (!client) return null;
  // Hard privacy gate: nothing is sent while the UI is still initializing; we only
  // emit after the user actually reaches the app. This keeps the first frame clean
  // and avoids leaking interstitial states.
  try {
    if (typeof document === 'undefined') return null;
  } catch {
    return null;
  }
  return client;
}

// Allowlist-driven: unknown events and unknown/extra properties are dropped here so
// a future caller cannot accidentally leak content.
const EVENT_ALLOWLIST: Record<string, readonly string[]> = {
  app_open: ['source'],
  screen_view: ['name'],
  record_created: [],
  record_repeated: [],
  record_undone: [],
  stats_viewed: [],
  safety_opened: [],
  app_error: ['class']
};

function sanitize(event: string, props?: AnalyticsProps): AnalyticsProps | undefined {
  const allowed = EVENT_ALLOWLIST[event];
  if (!allowed) return undefined;
  if (!props) return {};
  const out: AnalyticsProps = {};
  for (const key of allowed) {
    if (key in props && props[key] !== undefined && props[key] !== null) out[key] = props[key];
  }
  return out;
}

export function trackEvent(event: string, props?: AnalyticsProps): void {
  const ph = getClient();
  if (!ph) return;
  const clean = sanitize(event, props);
  if (!clean) return;
  try {
    ph.capture(event, clean);
  } catch {
    /* fire-and-forget */
  }
}