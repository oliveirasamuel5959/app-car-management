import { describe, expect, it } from 'vitest';

import {
  STATUS_META,
  formatBRL,
  formatDateShort,
  formatDateTime,
} from './service-status';

describe('service-status', () => {
  it('covers every service status with a PT-BR label and colors', () => {
    const statuses = [
      'pending',
      'confirmed',
      'in_progress',
      'completed',
      'cancelled',
      'rejected',
      'paid',
      'refunded',
    ] as const;

    for (const status of statuses) {
      expect(STATUS_META[status], status).toBeDefined();
      expect(STATUS_META[status].label, status).toBeTruthy();
      expect(STATUS_META[status].color, status).toMatch(/^#/);
      expect(STATUS_META[status].bg, status).toMatch(/^#/);
    }
  });

  it('formats currency as BRL', () => {
    expect(formatBRL(120)).toBe('R$ 120,00');
    expect(formatBRL(1234.5)).toBe('R$ 1.234,50');
  });

  it('formats short dates as dd/mm/yyyy', () => {
    expect(formatDateShort('2026-06-02T17:00:00')).toBe('02/06/2026');
  });

  it('formats date-times in pt-BR', () => {
    const formatted = formatDateTime('2026-06-01T09:00:00');
    expect(formatted).toContain('01/06/2026');
    expect(formatted).toContain('09:00');
  });
});
