import { describe, expect, it } from 'vitest';

import {
  SCHEDULE_STATUS_META,
  STATUS_META,
  TYPE_LABELS,
  formatBRL,
  formatDateShort,
  formatDateTime,
  getStatusMeta,
} from './status';

describe('status', () => {
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

  it('covers every schedule status separately from service orders', () => {
    const scheduleStatuses = [
      'pendente',
      'visualizado',
      'aceito',
      'recusado',
    ] as const;

    for (const status of scheduleStatuses) {
      expect(SCHEDULE_STATUS_META[status], status).toBeDefined();
      expect(SCHEDULE_STATUS_META[status].label, status).toBeTruthy();
      expect(SCHEDULE_STATUS_META[status].className, status).toBeTruthy();
    }
  });

  it('keeps the two domains distinct where their labels collide', () => {
    // "Pendente" and "Recusado" exist in both domains but are different states
    // with different API strings. They must not resolve to the same entry.
    expect(STATUS_META.pending).not.toBe(SCHEDULE_STATUS_META.pendente);
    expect(STATUS_META.rejected).not.toBe(SCHEDULE_STATUS_META.recusado);
  });

  it('uses one spelling per state across the app', () => {
    // Four spellings of this state used to exist: "Em Andamento",
    // "Em Progresso", "Em progresso" and "Em andamento".
    expect(STATUS_META.in_progress.label).toBe('Em andamento');
    expect(STATUS_META.pending.label).toBe('Pendente');
    expect(STATUS_META.rejected.label).toBe('Recusado');
    expect(STATUS_META.cancelled.label).toBe('Cancelado');
    expect(STATUS_META.completed.label).toBe('Concluído');
  });

  it('gives every status a token class, not just a hex', () => {
    for (const [key, value] of Object.entries({
      ...STATUS_META,
      ...SCHEDULE_STATUS_META,
    })) {
      expect(value.className, key).toMatch(/^bg-status-/);
      expect(value.className, key).toMatch(/text-status-/);
    }
  });

  it('resolves a status from either domain, and degrades safely', () => {
    expect(getStatusMeta('in_progress').label).toBe('Em andamento');
    expect(getStatusMeta('aceito').label).toBe('Aceito');
    // An unknown value from the API still renders a label rather than crashing.
    expect(getStatusMeta('algo_novo').label).toBe('algo_novo');
  });

  it('labels every service request type', () => {
    expect(TYPE_LABELS.manutencao).toBe('Manutenção');
    expect(TYPE_LABELS.inspecao).toBe('Inspeção');
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
