import {
  CalendarDays,
  Car,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Wrench,
  ClipboardList,
  Users,
  Star,
  History,
  FilePlus,
} from 'lucide-react';

import type { NavGroup, NavItem } from '@/components/navigation/menu-item';

/**
 * The application menu, per role.
 *
 * Six destinations each, in groups, replacing the flat 9-item client menu and
 * 10-item workshop menu. The design merges three scheduling screens into one
 * "Agendamentos" entry and drops "Meus Serviços" as a page — progress moves to
 * the Dashboard and the appointment detail.
 *
 * Both roles' `Configurações` points at the profile route, which is where the
 * account settings live; keeping the label and the destination in step is why
 * the route exists under that name rather than being a dead link.
 */

export const CLIENT_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', path: '/client/dashboard', icon: LayoutDashboard },
      { label: 'Agendamentos', path: '/client/appointments', icon: CalendarDays },
    ],
  },
  {
    title: 'Meu veículo',
    items: [
      { label: 'Meu Carro', path: '/client/my-car', icon: Car },
      { label: 'Manutenção', path: '/client/service-history', icon: Wrench },
    ],
  },
  {
    title: 'Conta',
    items: [
      { label: 'Mensagens', path: '/client/messages', icon: MessageSquare },
      { label: 'Configurações', path: '/client/settings', icon: Settings },
    ],
  },
];

/**
 * The workshop menu.
 *
 * **Provisional.** The design covers only the client area, so unlike the client
 * menu this grouping is not drawn from a reference — TG11 finalises it. What it
 * does guarantee is that no page becomes unreachable: every workshop destination
 * that had a sidebar entry still has one.
 *
 * `/workshop/orders` is deliberately absent because it duplicates
 * `/workshop/services` (both list orders); it becomes a redirect in TG11 rather
 * than a second menu entry pointing at the same content.
 */
export const WORKSHOP_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', path: '/workshop/dashboard', icon: LayoutDashboard },
      { label: 'Ordens de Serviço', path: '/workshop/services', icon: ClipboardList },
      { label: 'Agendamentos', path: '/workshop/schedules', icon: CalendarDays },
    ],
  },
  {
    title: 'Oficina',
    items: [
      { label: 'Clientes', path: '/workshop/clients', icon: Users },
      { label: 'Serviços Oferecidos', path: '/workshop/services-offered', icon: Wrench },
      { label: 'Histórico', path: '/workshop/service-history', icon: History },
      { label: 'Criar Orçamento', path: '/workshop/orders/new', icon: FilePlus },
    ],
  },
  {
    title: 'Conta',
    items: [
      { label: 'Avaliações', path: '/workshop/ratings', icon: Star },
      { label: 'Mensagens', path: '/workshop/messages', icon: MessageSquare },
      { label: 'Configurações', path: '/workshop/settings', icon: Settings },
    ],
  },
];

/**
 * Flat list for a role, in menu order — used for the active-item lookup and for
 * deciding whether the current route belongs to the other role's area.
 */
export function navItemsFor(role: string | undefined): NavItem[] {
  const groups = role === 'WORKSHOP' ? WORKSHOP_NAV : CLIENT_NAV;
  return groups.flatMap((group) => group.items);
}

export function navGroupsFor(role: string | undefined): NavGroup[] {
  return role === 'WORKSHOP' ? WORKSHOP_NAV : CLIENT_NAV;
}

/**
 * The five bottom-bar destinations, in the design's order. The last one opens
 * the full grouped menu rather than navigating, which is how the design fits six
 * destinations into five slots on a phone.
 */
export interface BottomBarEntry {
  label: string;
  path?: string;
  icon: NavItem['icon'];
  /** True for the entry that opens the full menu instead of navigating. */
  opensMenu?: boolean;
}

export const CLIENT_BOTTOM_BAR: BottomBarEntry[] = [
  { label: 'Início', path: '/client/dashboard', icon: LayoutDashboard },
  { label: 'Agendar', path: '/client/appointments', icon: CalendarDays },
  { label: 'Carro', path: '/client/my-car', icon: Car },
  { label: 'Manutenção', path: '/client/service-history', icon: Wrench },
  { label: 'Mais', icon: Settings, opensMenu: true },
];

export const WORKSHOP_BOTTOM_BAR: BottomBarEntry[] = [
  { label: 'Início', path: '/workshop/dashboard', icon: LayoutDashboard },
  { label: 'Ordens', path: '/workshop/services', icon: ClipboardList },
  { label: 'Agenda', path: '/workshop/schedules', icon: CalendarDays },
  { label: 'Clientes', path: '/workshop/clients', icon: Users },
  { label: 'Mais', icon: Settings, opensMenu: true },
];

export function bottomBarFor(role: string | undefined): BottomBarEntry[] {
  return role === 'WORKSHOP' ? WORKSHOP_BOTTOM_BAR : CLIENT_BOTTOM_BAR;
}
