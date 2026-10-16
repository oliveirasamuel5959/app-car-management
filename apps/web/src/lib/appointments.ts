import type { Schedule } from '../services/schedule-service';

export type AppointmentTab = 'meus' | 'novo';
export type AppointmentGroup = 'proximos' | 'concluidos' | 'cancelados';

export function parseAppointmentTab(value: string | null): AppointmentTab {
  return value === 'novo' ? 'novo' : 'meus';
}

export function getAppointmentGroup(
  schedule: Schedule,
  now: Date = new Date(),
): AppointmentGroup {
  if (schedule.status === 'recusado') return 'cancelados';
  if (schedule.status === 'aceito' && new Date(schedule.scheduled_at) < now) {
    return 'concluidos';
  }
  return 'proximos';
}

export function filterAppointments(
  schedules: Schedule[],
  group: AppointmentGroup,
  now: Date = new Date(),
): Schedule[] {
  return schedules.filter((schedule) => getAppointmentGroup(schedule, now) === group);
}

export function buildScheduledAt(date: string, time: string, offset: string): string {
  return `${date}T${time}:00${offset}`;
}

export function getLocalTimezoneOffset(date = new Date()): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}
