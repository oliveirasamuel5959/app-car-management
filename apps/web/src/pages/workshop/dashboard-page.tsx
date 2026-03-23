import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';

import { useAuth } from '../../context/auth-context';
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

export default function WorkshopDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSummaries, setClientSummaries] = useState<ClientSummary[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [services, clients] = await Promise.all([
          serviceService.getServices(),
          workshopClientService.getClients(),
        ]);

        const clientNameById = new Map<number, string>();
        if (Array.isArray(clients)) {
          clients.forEach((client) => {
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
        console.error('Error fetching workshop data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        {user?.name && (
          <Typography variant="body1" color="textSecondary">
            Olá, {user.name}
          </Typography>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {clientSummaries.map((summary) => (
          <Grid item xs={12} key={summary.clientId}>
            <Card variant="outlined">
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
    </Container>
  );
}
