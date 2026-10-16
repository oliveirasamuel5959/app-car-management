import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CLIENT_NAV, WORKSHOP_NAV } from './navigation';

/**
 * Every menu destination must resolve to a route.
 *
 * This guards the defect the redesign found: both sidebars linked to
 * `/client/settings` and `/workshop/settings`, and neither route existed, so two
 * menu items navigated into a blank catch-all.
 *
 * The route table is read as **text** rather than imported. Importing
 * `routes/routes.tsx` pulls in every page, and with it the API layer, which reads
 * `location.origin` at module scope — that needs a DOM, and this suite runs in
 * `environment: 'node'`. Matching the declared paths is enough for the property
 * being tested: that the string a menu links to is a path the router declares.
 */

const routesSource = readFileSync(
  resolve(__dirname, '../routes/routes.tsx'),
  'utf8',
);

/** Every `path: '...'` the route table declares. */
function declaredPaths(): Set<string> {
  const paths = new Set<string>();
  for (const match of routesSource.matchAll(/path:\s*'([^']+)'/g)) {
    paths.add(match[1]);
  }
  return paths;
}

/** True when `path` matches a declared pattern, treating `:param` as a wildcard. */
function resolves(path: string, declared: Set<string>): boolean {
  if (declared.has(path)) return true;
  const segments = path.split('/');
  for (const template of declared) {
    const templateSegments = template.split('/');
    if (templateSegments.length !== segments.length) continue;
    if (
      templateSegments.every(
        (segment, index) => segment.startsWith(':') || segment === segments[index],
      )
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Destinations the menu points at whose route lands in a later task group.
 * TG8 adds the appointment detail route; TG11 adds the workshop redirects.
 */
const PENDING_ROUTES = new Set<string>([
  '/client/appointments/:orderId',
]);

describe('menu destinations', () => {
  const declared = declaredPaths();

  it('finds the declared routes', () => {
    expect(declared.size).toBeGreaterThan(0);
  });

  it.each([
    ...CLIENT_NAV.flatMap((g) => g.items.map((i) => ['cliente', i.path] as const)),
    ...WORKSHOP_NAV.flatMap((g) => g.items.map((i) => ['oficina', i.path] as const)),
  ])('%s: %s resolves to a declared route', (_area, path) => {
    if (PENDING_ROUTES.has(path)) return;
    expect(resolves(path, declared)).toBe(true);
  });

  it('leaves no stale entry in the pending list', () => {
    // Once TG6 lands the route, the pending entry must be removed — otherwise
    // the exemption silently outlives the work it was written for.
    for (const pending of PENDING_ROUTES) {
      expect(
        resolves(pending, declared),
        `${pending} now has a route; remove it from PENDING_ROUTES`,
      ).toBe(false);
    }
  });
});
