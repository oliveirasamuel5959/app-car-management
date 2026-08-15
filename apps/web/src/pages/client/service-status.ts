/**
 * Shared status metadata and formatters for the client service pages.
 * Colors match the app theme (apps/web/src/theme.ts) status semantics.
 */

export interface ServiceStatusMeta {
  label: string;
  color: string;
  bg: string;
}

export const STATUS_META: Record<string, ServiceStatusMeta> = {
  pending: { label: 'Pendente', color: '#B45309', bg: '#FEF3C7' },
  confirmed: { label: 'Confirmado', color: '#0A5583', bg: '#E0F2FE' },
  in_progress: { label: 'Em andamento', color: '#0E7490', bg: '#CFFAFE' },
  completed: { label: 'Concluído', color: '#15803D', bg: '#DCFCE7' },
  cancelled: { label: 'Cancelado', color: '#B91C1C', bg: '#FEE2E2' },
};

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(value)
    .replace(/\u00A0/g, ' ');
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
