import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  ButtonBase,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { ChevronRight as ChevronRightIcon } from '@mui/icons-material';

import { useAuth } from '../../context/auth-context';
import { useRealtimeRefresh } from '../../realtime/use-realtime-refresh';
import { serviceService } from '../../services/service-service';
import {
  STATUS_META,
  formatBRL,
  formatDateShort,
} from './service-status';

interface Service {
  id: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
  name: string;
  checkin_date?: string | null;
  estimated_finish_date?: string | null;
  workshop_id?: number | null;
  estimated_cost?: number | null;
  progress_percentage?: number | null;
}

interface ServiceSummary {
  total_orders: number;
  active_orders: number;
  pending_orders: number;
  confirmed_orders: number;
  in_progress_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  recent_orders: Service[];
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeService, setActiveService] = useState<Service | null>(null);
  const [summary, setSummary] = useState<ServiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshKey = useRealtimeRefresh('order_status_change');

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const nextSummary: ServiceSummary = await serviceService.getClientSummary();
        setSummary(nextSummary);

        const recentOrders = Array.isArray(nextSummary.recent_orders) ? nextSummary.recent_orders : [];
        const preferred = recentOrders.find((service) => service.status === 'in_progress')
          || recentOrders.find((service) => service.status === 'confirmed')
          || recentOrders.find((service) => service.status === 'pending')
          || recentOrders[0]
          || null;

        setActiveService(preferred);
      } catch (err) {
        console.error('Failed to fetch services', err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [refreshKey]);

  const activeMeta = activeService ? STATUS_META[activeService.status] ?? STATUS_META.pending : null;

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Olá, {user?.name?.split(' ')[0]}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Acompanhe seus serviços e agendamentos.
        </Typography>
      </Box>

      {/* Current service snapshot */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderLeft: '4px solid',
          borderLeftColor: activeMeta?.color ?? 'divider',
          p: 3,
        }}
      >
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', letterSpacing: '0.08em', lineHeight: 1, display: 'block' }}
        >
          Seu serviço atual
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : activeService ? (
          <>
            <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
              {activeService.name}
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                {activeService.checkin_date ? `Entrada ${formatDateShort(activeService.checkin_date)}` : ''}
                {activeService.estimated_finish_date
                  ? ` · Previsão ${formatDateShort(activeService.estimated_finish_date)}`
                  : ''}
              </Typography>
              {activeMeta && (
                <Chip
                  label={activeMeta.label}
                  size="small"
                  sx={{ bgcolor: activeMeta.bg, color: activeMeta.color, fontWeight: 600 }}
                />
              )}
            </Stack>
            {activeService.estimated_cost != null && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                Custo estimado: {formatBRL(activeService.estimated_cost)}
              </Typography>
            )}
          </>
        ) : (
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            Nenhum serviço em andamento. Quando você agendar uma visita, ele aparece aqui.
          </Typography>
        )}
      </Paper>

      {/* Stat tiles */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mt: 3,
        }}
      >
        {[
          { label: 'Ativos', value: summary?.active_orders ?? 0 },
          { label: 'Pendentes', value: summary?.pending_orders ?? 0 },
          { label: 'Confirmados', value: summary?.confirmed_orders ?? 0 },
          { label: 'Em andamento', value: summary?.in_progress_orders ?? 0 },
        ].map((item) => (
          <Paper
            key={item.label}
            elevation={0}
            sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', p: 2.5 }}
          >
            <Typography
              variant="overline"
              sx={{ color: 'text.secondary', letterSpacing: '0.08em', lineHeight: 1, display: 'block' }}
            >
              {item.label}
            </Typography>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, mt: 0.75, fontVariantNumeric: 'tabular-nums' }}
            >
              {loading ? '—' : item.value}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Recent orders */}
      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', p: 3, mt: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Pedidos recentes
        </Typography>
        <Box sx={{ mt: 1 }}>
          {(summary?.recent_orders ?? []).slice(0, 5).map((service, index, list) => {
            const meta = STATUS_META[service.status] ?? STATUS_META.pending;
            return (
              <ButtonBase
                key={service.id}
                onClick={() => navigate(`/client/services/${service.id}`)}
                sx={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  textAlign: 'left',
                  py: 1.5,
                  px: 1,
                  borderRadius: 1,
                  borderBottom: index === list.length - 1 ? 'none' : '1px solid',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {service.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    OS #{service.id}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={meta.label}
                    size="small"
                    sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 600 }}
                  />
                  <ChevronRightIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </Box>
              </ButtonBase>
            );
          })}
          {!loading && (summary?.recent_orders?.length ?? 0) === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              Nenhum pedido ainda. Quando a oficina criar um serviço para você, ele aparece aqui.
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
