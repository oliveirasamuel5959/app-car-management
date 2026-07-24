import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableContainer,
  CircularProgress,
  TextField,
  MenuItem,
  Alert,
  Chip,
} from '@mui/material';
import {
  workshopServiceHistoryService,
  SERVICE_TYPE_OPTIONS,
  SERVICE_TYPE_LABELS,
  formatServiceHistoryDate as formatDate,
  formatServiceHistoryCurrency as formatCurrency,
  formatServiceHistoryMileage as formatMileage,
  type ServiceHistory,
} from '../../services/service-history-service';
import { workshopClientService } from '../../services/workshop-client-service';
import type { WorkshopClient } from '../../services/workshop-client-service';

export default function WorkshopServiceHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [records, setRecords] = useState<ServiceHistory[]>([]);
  const [clients, setClients] = useState<WorkshopClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [filterClient, setFilterClient] = useState<string>(searchParams.get('client') ?? '');

  const fetchRecords = async (serviceType?: string, clientId?: string) => {
    try {
      setLoading(true);
      setError(null);
      const filters: { service_type?: string; workshop_client_id?: number } = {};
      if (serviceType) filters.service_type = serviceType;
      if (clientId) filters.workshop_client_id = Number(clientId);
      const data = await workshopServiceHistoryService.list(
        Object.keys(filters).length ? filters : undefined,
      );
      setRecords(data);
    } catch (err) {
      console.error('Failed to fetch workshop service history:', err);
      setError(err instanceof Error ? err.message : 'Falha ao carregar o histórico de manutenção');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load the client list once for the filter dropdown.
    workshopClientService
      .getClients()
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]));
  }, []);

  useEffect(() => {
    fetchRecords(filterType || undefined, filterClient || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilterType(value);
    fetchRecords(value || undefined, filterClient || undefined);
  };

  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilterClient(value);
    // keep the URL in sync so the filter is shareable / survives refresh
    if (value) {
      setSearchParams({ client: value });
    } else {
      setSearchParams({});
    }
    fetchRecords(filterType || undefined, value || undefined);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Histórico de Manutenção
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
          Manutenções registradas automaticamente ao concluir ordens de serviço da sua oficina.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          select
          label="Filtrar por cliente"
          value={filterClient}
          onChange={handleClientChange}
          size="small"
          sx={{ minWidth: 260 }}
        >
          <MenuItem value="">Todos os clientes</MenuItem>
          {clients.map((client) => (
            <MenuItem key={client.id} value={String(client.id)}>
              {client.name} — {client.vehicle_plate}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Filtrar por tipo de serviço"
          value={filterType}
          onChange={handleTypeChange}
          size="small"
          sx={{ minWidth: 260 }}
        >
          <MenuItem value="">Todos os tipos</MenuItem>
          {SERVICE_TYPE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={10}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>Veículo</TableCell>
                <TableCell>Tipo de Serviço</TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Quilometragem</TableCell>
                <TableCell>Mão de Obra</TableCell>
                <TableCell>Peças</TableCell>
                <TableCell>Nota Fiscal</TableCell>
                <TableCell>Data do Serviço</TableCell>
                <TableCell>Próxima Revisão</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((record) => (
                <TableRow key={record.id} hover>
                  <TableCell>{`Veículo #${record.vehicle_id}`}</TableCell>
                  <TableCell>
                    <Chip label={SERVICE_TYPE_LABELS[record.service_type] ?? record.service_type} size="small" />
                  </TableCell>
                  <TableCell>{record.description || '-'}</TableCell>
                  <TableCell>{formatMileage(record.current_mileage)}</TableCell>
                  <TableCell>{formatCurrency(record.labor_cost)}</TableCell>
                  <TableCell>{formatCurrency(record.parts_cost)}</TableCell>
                  <TableCell>{record.invoice_number || '-'}</TableCell>
                  <TableCell>{formatDate(record.serviced_at)}</TableCell>
                  <TableCell>
                    {formatDate(record.next_service_date)}
                    {record.next_service_mileage != null && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {formatMileage(record.next_service_mileage)}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Nenhuma manutenção registrada ainda. Registros aparecem aqui quando você conclui uma ordem de serviço informando os dados de manutenção.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
