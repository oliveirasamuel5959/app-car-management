import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Button,
  Chip,
} from '@mui/material';

import {
  Add as AddIcon,
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';
import { serviceService } from '../../services/service-service';
import { workshopClientService } from '../../services/workshop-client-service';

interface ServiceItem {
  id: number;
  workshop_client_id?: number | null;
  name: string;
  status: string;
  checkin_date: string;
  estimated_finish_date?: string | null;
  workshop_notes?: string | null;
  created_at?: string | null;
}

interface ClientSummary {
  clientId: number;
  clientName: string;
  latestService: ServiceItem;
  openServicesCount: number;
}

const statusLabelMap: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  in_progress: 'Em progresso',
  waiting_parts: 'Aguardando peças',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const statusColorMap: Record<string, 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'info',
  in_progress: 'info',
  waiting_parts: 'default',
  completed: 'success',
  cancelled: 'error',
};

function getServiceCreatedDate(service: ServiceItem) {
  return service.created_at || service.checkin_date;
}

function formatFullDate(value?: string | null) {
  if (!value) return 'Sem data prevista';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data prevista';

  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatRelativeCreatedAt(value?: string | null) {
  if (!value) return 'Agora - Uma nova tarefa foi criada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Agora - Uma nova tarefa foi criada';

  const diffMs = date.getTime() - Date.now();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

  let relativeText: string;
  if (Math.abs(diffMs) < hour) {
    relativeText = rtf.format(Math.round(diffMs / minute), 'minute');
  } else if (Math.abs(diffMs) < day) {
    relativeText = rtf.format(Math.round(diffMs / hour), 'hour');
  } else {
    relativeText = rtf.format(Math.round(diffMs / day), 'day');
  }

  const normalized = relativeText.charAt(0).toUpperCase() + relativeText.slice(1);
  return `${normalized} - Uma nova tarefa foi criada`;
}

function extractServiceTypes(workshopNotes?: string | null) {
  if (!workshopNotes) return 'Não informado';

  const typeSection = workshopNotes
    .split('|')
    .map((part) => part.trim())
    .find((part) => part.startsWith('Tipo:'));

  if (!typeSection) return 'Não informado';

  const rawTypes = typeSection.replace('Tipo:', '').trim();
  if (!rawTypes) return 'Não informado';

  return rawTypes
    .split(',')
    .map((type) => type.trim())
    .filter(Boolean)
    .map((type) => {
      if (type === 'mecanico') return 'Mecânico';
      if (type === 'eletrico') return 'Elétrico';
      if (type === 'preventiva') return 'Preventiva';
      if (type === 'periodico') return 'Periódico';
      return type;
    })
    .join(', ');
}

export default function WorkshopServicesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSummaries, setClientSummaries] = useState<ClientSummary[]>([]);

  useEffect(() => {
    const fetchOrdersData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [services, clientsList] = await Promise.all([
          serviceService.getServices(),
          workshopClientService.getClients(),
        ]);

        const clientNameById = new Map<number, string>();
        if (Array.isArray(clientsList)) {
          clientsList.forEach((client) => {
            clientNameById.set(client.id, client.name);
          });
        }

        if (services && Array.isArray(services)) {
          const openServices = (services as ServiceItem[]).filter(
            (service) => service.status !== 'completed' && service.status !== 'cancelled'
          );

          const servicesByClient = new Map<number, ServiceItem[]>();
          openServices.forEach((service) => {
            if (!service.workshop_client_id) return;

            const existing = servicesByClient.get(service.workshop_client_id) || [];
            existing.push(service);
            servicesByClient.set(service.workshop_client_id, existing);
          });

          const summaries: ClientSummary[] = Array.from(servicesByClient.entries()).map(
            ([clientId, clientServices]) => {
              const sortedServices = [...clientServices].sort((a, b) => {
                const aTime = new Date(getServiceCreatedDate(a) || '').getTime();
                const bTime = new Date(getServiceCreatedDate(b) || '').getTime();
                return bTime - aTime;
              });

              return {
                clientId,
                clientName: clientNameById.get(clientId) || `Cliente #${clientId}`,
                latestService: sortedServices[0],
                openServicesCount: clientServices.length,
              };
            }
          );

          summaries.sort((a, b) => {
            const aTime = new Date(getServiceCreatedDate(a.latestService) || '').getTime();
            const bTime = new Date(getServiceCreatedDate(b.latestService) || '').getTime();
            return bTime - aTime;
          });

          setClientSummaries(summaries);
        } else {
          setClientSummaries([]);
        }
      } catch (err) {
        console.error('Error fetching workshop orders:', err);
        setError(err instanceof Error ? err.message : 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrdersData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight={700}>
          Ordens de Serviço
        </Typography>
        <Button
          onClick={() => navigate('/workshop/orders/new')}
          variant="contained"
          color="primary"
          size="medium"
          startIcon={<AddIcon />}
        >
          Criar Orçamento
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {clientSummaries.map((summary) => (
          <Grid item xs={12} key={summary.clientId}>
            <Card
              variant="outlined"
              onClick={() => navigate(`/workshop/clients/${summary.clientId}/orders`)}
              sx={{ cursor: 'pointer', '&:hover': { boxShadow: 3 } }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {summary.clientName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {formatRelativeCreatedAt(getServiceCreatedDate(summary.latestService))}
                    </Typography>
                  </Box>

                  <Chip
                    label={statusLabelMap[summary.latestService.status] || summary.latestService.status}
                    color={statusColorMap[summary.latestService.status] || 'default'}
                    size="small"
                  />
                </Box>

                <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {summary.latestService.name}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    Finalização prevista: {formatFullDate(summary.latestService.estimated_finish_date)}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Tipo de serviço: {extractServiceTypes(summary.latestService.workshop_notes)}
                  </Typography>

                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Serviços em aberto para este cliente: {summary.openServicesCount}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {clientSummaries.length === 0 && !error && (
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  Nenhum cliente com serviços em aberto no momento.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
