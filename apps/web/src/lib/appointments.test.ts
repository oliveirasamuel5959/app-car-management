import { describe, expect, it } from 'vitest';
import type { Schedule } from '../services/schedule-service';
import {
  buildScheduledAt,
  filterAppointments,
  getAppointmentGroup,
  getLocalTimezoneOffset,
  parseAppointmentTab,
} from './appointments';

const schedule = (overrides: Partial<Schedule>): Schedule => ({
  id: 1,
  client_tenant_id: 'client',
  workshop_tenant_id: 'workshop',
  workshop_id: 2,
  vehicle_id: null,
  service_request_type: 'manutencao',
  problem_description: 'Revisão',
  contact_phone: '11999999999',
  contact_email: 'client@example.com',
  client_name: null,
  scheduled_at: '2026-10-17T10:00:00-03:00',
  status: 'pendente',
  viewed_at: null,
  responded_at: null,
  created_at: '2026-10-01T10:00:00-03:00',
  updated_at: null,
  ...overrides,
});

const now = new Date('2026-10-16T12:00:00-03:00');

describe('appointment helpers', () => {
  it('defaults invalid or missing tab values to my appointments', () => {
    expect(parseAppointmentTab(null)).toBe('meus');
    expect(parseAppointmentTab('invalid')).toBe('meus');
    expect(parseAppointmentTab('novo')).toBe('novo');
  });

  it('keeps rejected requests in cancelled regardless of their date', () => {
    expect(getAppointmentGroup(schedule({ status: 'recusado' }), now)).toBe('cancelados');
    expect(getAppointmentGroup(schedule({ status: 'recusado', scheduled_at: '2026-10-15T10:00:00-03:00' }), now)).toBe('cancelados');
  });

  it('classifies accepted requests by their scheduled time', () => {
    expect(getAppointmentGroup(schedule({ status: 'aceito' }), now)).toBe('proximos');
    expect(getAppointmentGroup(schedule({ status: 'aceito', scheduled_at: '2026-10-15T10:00:00-03:00' }), now)).toBe('concluidos');
  });

  it('keeps pending and viewed requests in upcoming even when their date passed', () => {
    expect(getAppointmentGroup(schedule({ status: 'pendente', scheduled_at: '2026-10-15T10:00:00-03:00' }), now)).toBe('proximos');
    expect(getAppointmentGroup(schedule({ status: 'visualizado', scheduled_at: '2026-10-15T10:00:00-03:00' }), now)).toBe('proximos');
  });

  it('filters schedules into the selected presentation bucket', () => {
    const schedules = [
      schedule({ id: 1 }),
      schedule({ id: 2, status: 'aceito', scheduled_at: '2026-10-15T10:00:00-03:00' }),
      schedule({ id: 3, status: 'recusado' }),
    ];
    expect(filterAppointments(schedules, 'concluidos', now).map(({ id }) => id)).toEqual([2]);
  });

  it('preserves the local offset in the API datetime', () => {
    expect(buildScheduledAt('2026-10-17', '14:00', '-03:00')).toBe('2026-10-17T14:00:00-03:00');
    expect(buildScheduledAt('2026-10-17', '14:00', '+00:00')).toBe('2026-10-17T14:00:00+00:00');
  });

  it('formats a local timezone offset', () => {
    const offset = getLocalTimezoneOffset(new Date('2026-10-16T12:00:00-03:00'));
    expect(offset).toMatch(/^[+-]\d{2}:\d{2}$/);
  });
});
