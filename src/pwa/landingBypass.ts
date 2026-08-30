export const LANDING_NAV_DENYLIST = /\/landing(?:\/|$)/;

export function isLandingPath(pathname: string): boolean {
  return LANDING_NAV_DENYLIST.test(pathname);
}
