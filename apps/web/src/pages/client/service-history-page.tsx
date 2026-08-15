import { useEffect, useState } from 'react';
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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Alert,
  Divider,
  IconButton,
  Chip,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Info as InfoIcon } from '@mui/icons-material';
import {
  serviceHistoryService,
  SERVICE_TYPE_OPTIONS,
  SERVICE_TYPE_LABELS,
  formatServiceHistoryDate as formatDate,
  formatServiceHistoryCurrency as formatCurrency,
  formatServiceHistoryMileage as formatMileage,
  type ServiceHistory,
  type ServiceHistoryType,
} from '../../services/service-history-service';
import { carService } from '../../services/car-service';
import PartsBreakdownDialog from '../../components/service-orders/parts-breakdown-dialog';

interface VehicleOption {
  id: number;
  brand: string;
  model: string;
  plate?: string | null;
}

interface FormState {
  vehicle_id: string;
  service_type: ServiceHistoryType;
  description: string;
  current_mileage: string;
  labor_cost: string;
  parts_cost: string;
  serviced_at: string;
}

const todayISODate = () => new Date().toISOString().slice(0, 10);

const initialFormState: FormState = {
  vehicle_id: '',
  service_type: 'oil_change',
  description: '',
  current_mileage: '',
  labor_cost: '',
  parts_cost: '',
  serviced_at: todayISODate(),
};

export default function ServiceHistoryPage() {
  const [records, setRecords] = useState<ServiceHistory[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<string>('');

  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [breakdownOrderId, setBreakdownOrderId] = useState<number | null>(null);

  const fetchRecords = async (serviceType?: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await serviceHistoryService.list(
        serviceType ? { service_type: serviceType } : undefined,
      );
      setRecords(data);
    } catch (err) {
      console.error('Failed to fetch service history:', err);
      setError(err instanceof Error ? err.message : 'Falha ao carregar o histórico de manutenção');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const data = await carService.getAllCars();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
      setVehicles([]);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchVehicles();
  }, []);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilterType(value);
    fetchRecords(value || undefined);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      ...initialFormState,
      serviced_at: todayISODate(),
      vehicle_id: vehicles.length === 1 ? String(vehicles[0].id) : '',
    });
    setFormError(null);
    setSuccess(null);
    setOpenDialog(true);
  };

  const handleOpenEdit = (record: ServiceHistory) => {
    if (record.workshop_id != null) return;
    setEditingId(record.id);
    setFormData({
      vehicle_id: String(record.vehicle_id),
      service_type: record.service_type,
      description: record.description ?? '',
      current_mileage: record.current_mileage != null ? String(record.current_mileage) : '',
      labor_cost: record.labor_cost != null ? String(record.labor_cost) : '',
      parts_cost: record.parts_cost != null ? String(record.parts_cost) : '',
      serviced_at: record.serviced_at ? record.serviced_at.slice(0, 10) : todayISODate(),
    });
    setFormError(null);
    setSuccess(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
    setFormData(initialFormState);
    setFormError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.vehicle_id) {
      setFormError('Selecione um veículo');
      return;
    }
    if (!formData.current_mileage) {
      setFormError('A quilometragem atual é obrigatória');
      return;
    }
    if (!formData.serviced_at) {
      setFormError('A data do serviço é obrigatória');
      return;
    }

    const payload = {
      vehicle_id: Number(formData.vehicle_id),
      service_type: formData.service_type,
      description: formData.description.trim() || null,
      current_mileage: Number(formData.current_mileage),
      labor_cost: formData.labor_cost ? Number(formData.labor_cost) : null,
      parts_cost: formData.parts_cost ? Number(formData.parts_cost) : null,
      serviced_at: new Date(formData.serviced_at).toISOString(),
    };

    try {
      setSubmitting(true);
      setFormError(null);
      if (editingId != null) {
        await serviceHistoryService.update(editingId, payload);
        setSuccess('Manutenção atualizada com sucesso!');
      } else {
        await serviceHistoryService.create(payload);
        setSuccess('Manutenção registrada com sucesso!');
      }
      handleCloseDialog();
      fetchRecords(filterType || undefined);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Falha ao salvar a manutenção');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (record: ServiceHistory) => {
    if (record.workshop_id != null) return;
    const historyId = record.id;
    if (!confirm('Tem certeza que deseja remover este registro de manutenção?')) return;
    try {
      await serviceHistoryService.delete(historyId);
      setSuccess('Registro removido com sucesso!');
      fetchRecords(filterType || undefined);
    } catch (err) {
      console.error('Failed to delete service history:', err);
      setError(err instanceof Error ? err.message : 'Falha ao remover o registro');
    }
  };

  const vehicleLabel = (vehicleId: number) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return `Veículo #${vehicleId}`;
    return `${vehicle.brand} ${vehicle.model}${vehicle.plate ? ` (${vehicle.plate})` : ''}`;
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Histórico de Manutenção
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
            Registre as manutenções realizadas nos seus veículos e acompanhe as previsões da próxima revisão.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          Adicionar Manutenção
        </Button>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          select
          label="Filtrar por tipo de serviço"
          value={filterType}
          onChange={handleFilterChange}
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
                <TableCell>Data do Serviço</TableCell>
                <TableCell>Próxima Revisão</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((record) => {
                const isWorkshopAuthored = record.workshop_id != null;
                const hasOrderLink = record.service_order_id != null;
                return (
                  <TableRow
                    key={record.id}
                    hover
                    onClick={
                      hasOrderLink
                        ? () => setBreakdownOrderId(record.service_order_id ?? null)
                        : undefined
                    }
                    sx={hasOrderLink ? { cursor: 'pointer' } : undefined}
                  >
                    <TableCell>{vehicleLabel(record.vehicle_id)}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                        <Chip label={SERVICE_TYPE_LABELS[record.service_type] ?? record.service_type} size="small" />
                        {isWorkshopAuthored && (
                          <Chip label="Adicionado pela oficina" size="small" color="info" variant="outlined" />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>{record.description || '-'}</TableCell>
                    <TableCell>{formatMileage(record.current_mileage)}</TableCell>
                    <TableCell>{formatCurrency(record.labor_cost)}</TableCell>
                    <TableCell>{formatCurrency(record.parts_cost)}</TableCell>
                    <TableCell>{formatDate(record.serviced_at)}</TableCell>
                    <TableCell>
                      {formatDate(record.next_service_date)}
                      {record.next_service_mileage != null && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          {formatMileage(record.next_service_mileage)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={isWorkshopAuthored ? 'Registro criado pela oficina — somente leitura' : ''}>
                        <span>
                          {hasOrderLink && (
                            <Tooltip title="Ver detalhes da ordem de serviço">
                              <IconButton
                                size="small"
                                color="info"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setBreakdownOrderId(record.service_order_id ?? null);
                                }}
                              >
                                <InfoIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <IconButton
                            size="small"
                            color="primary"
                            disabled={isWorkshopAuthored}
                            onClick={() => handleOpenEdit(record)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={isWorkshopAuthored}
                            onClick={() => handleDelete(record)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
              {records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Nenhuma manutenção registrada. Clique em "Adicionar Manutenção" para começar.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId != null ? 'Editar Manutenção' : 'Adicionar Manutenção'}</DialogTitle>
        <Divider />
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            {formError && <Alert severity="error">{formError}</Alert>}

            <TextField
              select
              label="Veículo*"
              name="vehicle_id"
              fullWidth
              required
              value={formData.vehicle_id}
              onChange={handleInputChange}
            >
              {vehicles.length === 0 && (
                <MenuItem value="" disabled>
                  Nenhum veículo cadastrado
                </MenuItem>
              )}
              {vehicles.map((vehicle) => (
                <MenuItem key={vehicle.id} value={String(vehicle.id)}>
                  {vehicle.brand} {vehicle.model}
                  {vehicle.plate ? ` (${vehicle.plate})` : ''}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Tipo de Serviço*"
              name="service_type"
              fullWidth
              required
              value={formData.service_type}
              onChange={handleInputChange}
            >
              {SERVICE_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Descrição"
              name="description"
              fullWidth
              multiline
              minRows={2}
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Detalhes do serviço realizado"
            />

            <TextField
              label="Quilometragem atual (km)*"
              name="current_mileage"
              type="number"
              fullWidth
              required
              value={formData.current_mileage}
              onChange={handleInputChange}
              InputProps={{ inputProps: { min: 0 } }}
            />

            <TextField
              label="Mão de Obra (R$)"
              name="labor_cost"
              type="number"
              fullWidth
              value={formData.labor_cost}
              onChange={handleInputChange}
              InputProps={{ inputProps: { min: 0, step: '0.01' } }}
            />

            <TextField
              label="Peças (R$)"
              name="parts_cost"
              type="number"
              fullWidth
              value={formData.parts_cost}
              onChange={handleInputChange}
              InputProps={{ inputProps: { min: 0, step: '0.01' } }}
            />

            <TextField
              label="Data do Serviço*"
              name="serviced_at"
              type="date"
              fullWidth
              required
              value={formData.serviced_at}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary" disabled={submitting}>
            {submitting ? 'Salvando...' : editingId != null ? 'Salvar' : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order breakdown drill-down */}
      <PartsBreakdownDialog
        open={breakdownOrderId !== null}
        serviceOrderId={breakdownOrderId}
        onClose={() => setBreakdownOrderId(null)}
      />
    </Box>
  );
}
