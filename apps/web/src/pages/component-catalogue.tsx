import { useState } from 'react';
import {
  CalendarDays,
  Car,
  LayoutDashboard,
  MessageSquare,
  Wrench,
  Settings,
  Inbox,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { StatsBar } from '@/components/ui/stats-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import { MenuGroup, MenuItem } from '@/components/navigation/menu-item';
import { CurrentServiceCard } from '@/components/service-orders/current-service-card';
import { STATUS_META, SCHEDULE_STATUS_META, getStatusMeta } from '@/lib/status';

/**
 * ComponentCatalogue — every state of the six design-system components on one
 * page, so the design can be reviewed without navigating the app.
 *
 * This is a development surface for the redesign; it is not part of the product
 * navigation and is meant to be removed once the screens have been reviewed.
 */

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-card p-6">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      {note && <p className="mt-1 text-sm text-muted-foreground">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function ComponentCatalogue() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-8 sm:px-gutter">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Componentes
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seis peças reutilizáveis, cada uma com estados definidos, para todas as
          telas. Página de revisão — não faz parte da navegação do produto.
        </p>
      </header>

      <Section
        title="Botão"
        note="Padrão, hover, foco, desabilitado, carregando. Um primário por tela."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primário</Button>
          <Button variant="outline">Secundário</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destrutivo</Button>
          <Button disabled>Desabilitado</Button>
          <Button loading>Carregando</Button>
          <Button size="sm">Pequeno</Button>
          <Button size="icon" aria-label="Ícone">
            <Wrench className="h-4 w-4" />
          </Button>
        </div>
      </Section>

      <Section
        title="Faixa de indicadores"
        note="Quatro números em um só cartão. Cada um filtra Meus Agendamentos — clique para ver o estado selecionado."
      >
        <StatsBar
          items={[
            { label: 'Ativos', value: 0, onSelect: () => setSelected('ativos'), selected: selected === 'ativos' },
            { label: 'Pendentes', value: 2, onSelect: () => setSelected('pendentes'), selected: selected === 'pendentes' },
            { label: 'Confirmados', value: 1, onSelect: () => setSelected('confirmados'), selected: selected === 'confirmados' },
            { label: 'Em andamento', value: 0, onSelect: () => setSelected('andamento'), selected: selected === 'andamento' },
          ]}
        />
        <p className="mt-3 text-sm text-muted-foreground">
          Selecionado: {selected ?? 'nenhum'}
        </p>
      </Section>

      <Section
        title="Selo de status"
        note="O texto sempre diz o status; a cor nunca age sozinha. Os dois domínios ficam separados."
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              Ordens de serviço
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <StatusBadge key={key} status={meta} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              Agendamentos
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SCHEDULE_STATUS_META).map(([key, meta]) => (
                <StatusBadge key={key} status={meta} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              Tamanho pequeno, e um valor desconhecido da API
            </p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={STATUS_META.completed} size="sm" />
              <StatusBadge status={getStatusMeta('algo_novo')} size="sm" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Item de menu" note="Grupos com título. Vira barra inferior abaixo de 768px.">
        <div className="grid gap-6 sm:grid-cols-2">
          <nav className="rounded-md border border-border p-2" aria-label="Exemplo de menu">
            <MenuGroup
              group={{
                items: [
                  { label: 'Dashboard', path: '/client/dashboard', icon: LayoutDashboard },
                  { label: 'Agendamentos', path: '/client/appointments', icon: CalendarDays, badge: 3 },
                ],
              }}
              currentPath="/client/appointments"
            />
            <MenuGroup
              group={{
                title: 'Meu veículo',
                items: [
                  { label: 'Meu Carro', path: '/client/my-car', icon: Car },
                  { label: 'Manutenção', path: '/client/service-history', icon: Wrench },
                ],
              }}
              currentPath="/client/appointments"
            />
            <MenuGroup
              group={{
                title: 'Conta',
                items: [
                  { label: 'Mensagens', path: '/client/messages', icon: MessageSquare },
                  { label: 'Configurações', path: '/client/settings', icon: Settings },
                ],
              }}
              currentPath="/client/appointments"
            />
          </nav>

          <div className="self-end rounded-md border border-border bg-card p-2">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              Como barra inferior
            </p>
            <nav className="flex items-center justify-around" aria-label="Exemplo de barra inferior">
              {[
                { label: 'Início', path: '/client/dashboard', icon: LayoutDashboard },
                { label: 'Agendar', path: '/client/appointments', icon: CalendarDays },
                { label: 'Carro', path: '/client/my-car', icon: Car },
                { label: 'Manutenção', path: '/client/service-history', icon: Wrench },
                { label: 'Mais', path: '/client/settings', icon: Settings },
              ].map((item) => (
                <MenuItem
                  key={item.path}
                  item={item}
                  currentPath="/client/appointments"
                  compact
                />
              ))}
            </nav>
          </div>
        </div>
      </Section>

      <Section title="Estado vazio" note="Toda lista vazia explica e oferece um próximo passo.">
        <div className="flex flex-col gap-4">
          <EmptyState
            icon={Inbox}
            title="Nenhum pedido ainda"
            description="Quando a oficina criar um serviço para você, ele aparece aqui."
            action="Ver oficinas parceiras"
            onAction={() => undefined}
          />
          <EmptyState
            icon={CalendarDays}
            title="Sem mais agendamentos"
            action="Agendar uma nova visita"
            actionHref="/client/appointments"
          />
        </div>
      </Section>

      <Section title="Cartão de serviço atual" note="Etapas do serviço, oficina e previsão de entrega.">
        <div className="grid gap-4 lg:grid-cols-2">
          <CurrentServiceCard
            title="Troca de óleo e filtros"
            workshop="Oficina Silva"
            status="in_progress"
            statusMeta={STATUS_META.in_progress}
            footer="Previsão de entrega: 18/10/2026, 16:00"
            action={<Button variant="outline">Ver detalhes</Button>}
          />
          <CurrentServiceCard
            title="Revisão dos 20.000 km"
            workshop="Auto Center Central"
            status="pending"
            statusMeta={STATUS_META.pending}
            footer="Aguardando confirmação da oficina"
            action={<Button variant="outline">Ver detalhes</Button>}
          />
          <CurrentServiceCard
            title="Calibração de pneus"
            workshop="Oficina Silva"
            status="completed"
            statusMeta={STATUS_META.completed}
            footer="Concluído em 10/10/2026"
          />
          <CurrentServiceCard
            title="Alinhamento"
            workshop="Auto Center Central"
            status="cancelled"
            statusMeta={STATUS_META.cancelled}
            cancelled
            footer="Cancelado em 02/10/2026"
          />
        </div>
      </Section>
    </div>
  );
}
