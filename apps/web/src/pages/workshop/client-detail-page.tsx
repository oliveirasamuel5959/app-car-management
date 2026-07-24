import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Assignment as OrdersIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { workshopClientService } from '../../services/workshop-client-service';
import type { WorkshopClient } from '../../services/workshop-client-service';
import {
  workshopServiceHistoryService,
  SERVICE_TYPE_LABELS,
  formatServiceHistoryDate,
} from '../../services/service-history-service';
import type { ServiceHistory } from '../../services/service-history-service';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body1">{value ?? '-'}</Typography>
    </Box>
  );
}

export default function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<WorkshopClient | null>(null);
  const [history, setHistory] = useState<ServiceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!clientId) return;
      try {
        setLoading(true);
        setError(null);
        const id = Number(clientId);
        const [clientData, historyData] = await Promise.all([
          workshopClientService.getClientById(id),
          workshopServiceHistoryService
            .list({ workshop_client_id: id })
            .catch(() => [] as ServiceHistory[]),
        ]);
        setClient(clientData);
        setHistory(historyData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar o cliente');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [clientId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !client) {
    return (
      <Box sx={{ width: '100%' }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/workshop/clients')} sx={{ mb: 2 }}>
          Voltar
        </Button>
        <Alert severity="error">{error || 'Cliente não encontrado'}</Alert>
      </Box>
    );
  }

  const lastService = history[0]; // backend returns most-recent first
  const totalServices = history.length;

  return (
    <Box sx={{ width: '100%' }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/workshop/clients')} sx={{ mb: 2 }}>
        Voltar para Clientes
      </Button>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4">{client.name}</Typography>
        <Chip
          size="small"
          label={client.status === 'inactive' ? 'Inativo' : 'Ativo'}
          color={client.status === 'inactive' ? 'default' : 'success'}
          variant={client.status === 'inactive' ? 'outlined' : 'filled'}
        />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Contato
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <InfoRow label="Email" value={client.email || '-'} />
            <InfoRow label="Telefone" value={client.phone || '-'} />
            <InfoRow label="Cliente desde" value={formatServiceHistoryDate(client.created_at)} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Veículo
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <InfoRow label="Marca" value={client.vehicle_brand} />
            <InfoRow label="Modelo" value={client.vehicle_model} />
            <InfoRow label="Ano" value={client.vehicle_year} />
            <InfoRow label="Placa" value={client.vehicle_plate} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Resumo de Serviços
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <InfoRow label="Total de serviços registrados" value={totalServices} />
            <InfoRow
              label="Último serviço"
              value={
                lastService
                  ? `${SERVICE_TYPE_LABELS[lastService.service_type] ?? lastService.service_type} — ${formatServiceHistoryDate(lastService.serviced_at)}`
                  : 'Nenhum serviço registrado'
              }
            />
          </Paper>
        </Grid>

        {client.notes && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Observações
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {client.notes}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
        <Button
          variant="contained"
          startIcon={<OrdersIcon />}
          onClick={() => navigate(`/workshop/clients/${client.id}/orders`)}
        >
          Ver Ordens de Serviço
        </Button>
        <Button
          variant="outlined"
          startIcon={<HistoryIcon />}
          onClick={() => navigate(`/workshop/service-history?client=${client.id}`)}
        >
          Ver Histórico de Manutenção
        </Button>
      </Stack>
    </Box>
  );
}
