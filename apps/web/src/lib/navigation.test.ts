import { describe, expect, it } from 'vitest';

import {
  CLIENT_BOTTOM_BAR,
  CLIENT_NAV,
  WORKSHOP_BOTTOM_BAR,
  WORKSHOP_NAV,
  bottomBarFor,
  navGroupsFor,
  navItemsFor,
} from './navigation';
import { isPathActive } from '../components/navigation/menu-item';

describe('navigation', () => {
  it('gives the client exactly the six destinations the design draws', () => {
    expect(navItemsFor('CLIENT')).toHaveLength(6);
  });

  it('keeps every workshop page reachable', () => {
    // The design does not cover the workshop area, so its grouping is
    // provisional — but no page may lose its only entry point.
    const paths = navItemsFor('WORKSHOP').map((item) => item.path);
    for (const required of [
      '/workshop/dashboard',
      '/workshop/services',
      '/workshop/schedules',
      '/workshop/clients',
      '/workshop/services-offered',
      '/workshop/service-history',
      '/workshop/orders/new',
      '/workshop/ratings',
      '/workshop/messages',
      '/workshop/settings',
    ]) {
      expect(paths, required).toContain(required);
    }
  });

  it('groups the destinations, with the first group unlabelled', () => {
    for (const groups of [CLIENT_NAV, WORKSHOP_NAV]) {
      expect(groups.length).toBeGreaterThan(1);
      // Dashboard and the primary flow sit above the fold, without a heading.
      expect(groups[0].title).toBeUndefined();
      // Every other group is labelled, so the menu reads as sections.
      for (const group of groups.slice(1)) {
        expect(group.title).toBeTruthy();
      }
    }
  });

  it('retires the pages the redesign removes', () => {
    const clientPaths = navItemsFor('CLIENT').map((item) => item.path);
    // "Meus Serviços" stops being a page: progress moves to the Dashboard and
    // the appointment detail. "Novo Agendamento", "Meus Agendamentos" and
    // "Encontrar Oficinas" merge into one Agendamentos entry.
    expect(clientPaths).not.toContain('/client/services');
    expect(clientPaths).not.toContain('/client/scheduling');
    expect(clientPaths).not.toContain('/client/my-schedules');
    expect(clientPaths).not.toContain('/client/search-workshops');
    expect(clientPaths).toContain('/client/appointments');
    expect(CLIENT_BOTTOM_BAR.find((entry) => entry.label === 'Agendar')?.path).toBe('/client/appointments?tab=novo');
  });

  it('has no duplicate destinations', () => {
    for (const items of [navItemsFor('CLIENT'), navItemsFor('WORKSHOP')]) {
      const paths = items.map((item) => item.path);
      expect(new Set(paths).size).toBe(paths.length);
    }
  });

  it('falls back to the client menu for an unknown or missing role', () => {
    // The shell must render something sane before the session resolves.
    expect(navItemsFor(undefined)).toEqual(navItemsFor('CLIENT'));
    expect(navGroupsFor(undefined)).toEqual(CLIENT_NAV);
    expect(bottomBarFor(undefined)).toEqual(CLIENT_BOTTOM_BAR);
  });

  it('has five bottom-bar entries, the last opening the full menu', () => {
    for (const bar of [CLIENT_BOTTOM_BAR, WORKSHOP_BOTTOM_BAR]) {
      expect(bar).toHaveLength(5);
      const last = bar[bar.length - 1];
      expect(last.opensMenu).toBe(true);
      // It opens the menu rather than navigating, so it carries no path.
      expect(last.path).toBeUndefined();
      for (const entry of bar.slice(0, -1)) {
        expect(entry.path, entry.label).toBeTruthy();
      }
    }
  });

  it('marks a parent menu item active on its sub-routes', () => {
    // The previous sidebars compared the pathname exactly, so nothing was
    // highlighted while a user was on a detail route.
    expect(isPathActive('/client/appointments', '/client/appointments')).toBe(true);
    expect(isPathActive('/client/appointments/42', '/client/appointments')).toBe(true);
    expect(isPathActive('/client/appointments/42/edit', '/client/appointments')).toBe(true);
    // A sibling whose name merely starts the same way must not match.
    expect(isPathActive('/client/appointments-archive', '/client/appointments')).toBe(false);
    expect(isPathActive('/client/dashboard', '/client/appointments')).toBe(false);
  });
});
