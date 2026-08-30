import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isLandingPath } from './landingBypass';

const repoRoot = process.cwd();

describe('landing must not be the Mini App', () => {
  it('treats /landing URLs as the visiting card, not the app', () => {
    expect(isLandingPath('/usnee-app/landing/')).toBe(true);
    expect(isLandingPath('/usnee-app/landing')).toBe(true);
    expect(isLandingPath('/usnee-app/')).toBe(false);
    expect(isLandingPath('/usnee-app/learn')).toBe(false);
  });

  it('denylists /landing from the PWA navigate fallback', () => {
    const src = readFileSync(resolve(repoRoot, 'vite.config.ts'), 'utf8');
    expect(src).toContain('navigateFallbackDenylist');
    expect(src).toContain('landing');
  });

  it('bypasses a stale Mini App SW when the URL is /landing', () => {
    const html = readFileSync(resolve(repoRoot, 'index.html'), 'utf8');
    expect(html).toContain('/landing');
    expect(html).toContain('serviceWorker');
  });
});
