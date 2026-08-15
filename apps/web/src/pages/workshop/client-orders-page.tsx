import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  MenuItem,
} from '@mui/material';

import { ArrowBack as ArrowBackIcon, Visibility as ViewIcon } from '@mui/icons-material';

import { serviceService } from '../../services/service-service';
import { workshopClientService } from '../../services/workshop-client-service';
import type { WorkshopClient } from '../../services/workshop-client-service';
import { SERVICE_TYPE_OPTIONS, type ServiceHistoryType } from '../../services/service-history-service';
import PartsForm, {
  createEmptyPartsValue,
  normalizePartsValue,
  type PartsFormValue,
} from '../../components/service-orders/parts-form';
import RefundPaymentButton from '../../components/payments/refund-payment-button';

interface Service {
  id: number;
  name: string;
  description?: string;
  status: string;
  vehicle_id: number;
  workshop_id: number;
  workshop_client_id: number;
  checkin_date: string;
  estimated_finish_date?: string;
  progress_percentage: number;
  estimated_cost?: number;
  final_cost?: number;
  workshop_notes?: string;
}

interface CompletionFormState {
  service_type: ServiceHistoryType | '';
  current_mileage: string;
  invoice_number: string;
  warranty_until_date: string;
  warranty_mileage: string;
}

const initialCompletionForm: CompletionFormState = {
  service_type: '',
  current_mileage: '',
  invoice_number: '',
  warranty_until_date: '',
  warranty_mileage: '',
};

type StatusChipColor = 'success' | 'info' | 'warning' | 'primary' | 'error' | 'default';

function getStatusColor(status: string): StatusChipColor {
  switch (status) {
    case 'completed':
    case 'paid':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'pending':
    case 'refunded':
      return 'warning';
    case 'confirmed':
      return 'primary';
    case 'cancelled':
    case 'rejected':
      return 'error';
    default:
      return 'default';
  }
}

export default function ClientOrdersPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [client, setClient] = useState<WorkshopClient | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [completionForm, setCompletionForm] = useState<CompletionFormState>(initialCompletionForm);
  const [partsForm, setPartsForm] = useState<PartsFormValue>(createEmptyPartsValue());

  useEffect(() => {
    if (!clientId) return;
    fetchData(Number(clientId));
  }, [clientId]);

  const fetchData = async (id: number) => {
    try {
      setLoading(true);
      setError(null);

      const [clientsData, servicesData] = await Promise.all([
        workshopClientService.getClients(),
        serviceService.getServices({ workshop_client_id: id }),
      ]);

      const foundClient = Array.isArray(clientsData)
        ? clientsData.find((c: WorkshopClient) => c.id === id)
        : null;
      setClient(foundClient || null);
      setServices(Array.isArray(servicesData) ? servicesData : []);
    } catch (err) {
      console.error('Error fetching client orders:', err);
      setError(err instanceof Error ? err.message : 'Failed to load client orders');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = (service: Service) => {
    setSelectedService(service);
    setEditNotes(service.workshop_notes || '');
    setCompletionForm(initialCompletionForm);
    setPartsForm(createEmptyPartsValue());
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedService(null);
  };

  const handleCompletionFormChange = (field: keyof CompletionFormState) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setCompletionForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleUpdateStatus = async (action: 'start' | 'complete' | 'cancel') => {
    if (!selectedService) return;

    try {
      setUpdating(true);
      const payload: Record<string, unknown> = { workshop_notes: editNotes };

      if (action === 'complete') {
        if (completionForm.service_type) payload.service_type = completionForm.service_type;
        if (completionForm.current_mileage) payload.current_mileage = Number(completionForm.current_mileage);
        if (completionForm.invoice_number) payload.invoice_number = completionForm.invoice_number;
        if (completionForm.warranty_until_date) {
          payload.warranty_until_date = new Date(completionForm.warranty_until_date).toISOString();
        }
        if (completionForm.warranty_mileage) payload.warranty_mileage = Number(completionForm.warranty_mileage);

        const normalized = normalizePartsValue(partsForm);
        if (normalized.parts.length > 0) {
          payload.parts = normalized.parts;
        }
        if (normalized.laborDescription) {
          payload.labor_description = normalized.laborDescription;
        }
        if (normalized.laborCost !== null) {
          payload.labor_cost = normalized.laborCost;
        }
      }

      const updatedService = action === 'start'
        ? await serviceService.startServiceOrder(selectedService.id, payload)
        : action === 'complete'
          ? await serviceService.completeServiceOrder(selectedService.id, payload)
          : await serviceService.cancelServiceOrder(selectedService.id, payload);

      setServices((prev) =>
        prev.map((s) =>
          s.id === selectedService.id
            ? updatedService
            : s
        )
      );
      setSelectedService(updatedService);
    } catch (err) {
      console.error('Error updating service:', err);
    } finally {
      setUpdating(false);
    }
  };

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
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/workshop/clients')}
          sx={{ mb: 2 }}
        >
          Back to Clients
        </Button>

        <Typography variant="h4">
          {client ? `${client.name}'s Orders` : 'Client Orders'}
        </Typography>

        {client && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {client.vehicle_brand} {client.vehicle_model} ({client.vehicle_year}) — {client.vehicle_plate}
          </Typography>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {services.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="textSecondary">
              No orders found for this client.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
              <TableRow>
                <TableCell>Service</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Check-in Date</TableCell>
                <TableCell>Estimated Finish</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Cost</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{service.name}</Typography>
                    {service.description && (
                      <Typography variant="caption" color="textSecondary">
                        {service.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={service.status.replace('_', ' ').toUpperCase()}
                      color={getStatusColor(service.status)}
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{new Date(service.checkin_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {service.estimated_finish_date
                      ? new Date(service.estimated_finish_date).toLocaleDateString()
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{service.progress_percentage}%</Typography>
                  </TableCell>
                  <TableCell>
                    {service.estimated_cost ? `$${service.estimated_cost}` : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ViewIcon />}
                      onClick={() => handleViewOrder(service)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* View/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Order Details</DialogTitle>
        <Divider />
        <DialogContent sx={{ mt: 2 }}>
          {selectedService && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Service Name</Typography>
                <Typography variant="body1">{selectedService.name}</Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Description</Typography>
                <Typography variant="body2">{selectedService.description || 'No description'}</Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                <Chip label={selectedService.status.replace('_', ' ').toUpperCase()} color={getStatusColor(selectedService.status)} variant="outlined" size="small" />
              </Grid>

              {(selectedService.status === 'paid' ||
                selectedService.status === 'refunded') && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    {selectedService.status === 'paid'
                      ? 'Pagamento recebido'
                      : 'Pagamento reembolsado'}
                  </Typography>
                  {selectedService.status === 'paid' && (
                    <Box sx={{ mt: 1 }}>
                      <RefundPaymentButton
                        serviceOrderId={selectedService.id}
                        disabled={updating}
                        onRefunded={() => {
                          handleCloseDialog();
                          fetchData(Number(clientId));
                        }}
                      />
                    </Box>
                  )}
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Workshop Notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">Progress</Typography>
                <Typography variant="body1">{selectedService.progress_percentage}%</Typography>
              </Grid>

              {selectedService.status === 'in_progress' && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="subtitle2" color="textSecondary">
                      Dados da Manutenção (opcional)
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Informe o tipo de serviço e a quilometragem para registrar automaticamente esta manutenção no histórico do veículo.
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      select
                      fullWidth
                      label="Tipo de Serviço"
                      value={completionForm.service_type}
                      onChange={handleCompletionFormChange('service_type')}
                    >
                      <MenuItem value="">Não informado</MenuItem>
                      {SERVICE_TYPE_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Quilometragem atual (km)"
                      value={completionForm.current_mileage}
                      onChange={handleCompletionFormChange('current_mileage')}
                      InputProps={{ inputProps: { min: 0 } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <PartsForm value={partsForm} onChange={setPartsForm} />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Nota Fiscal"
                      value={completionForm.invoice_number}
                      onChange={handleCompletionFormChange('invoice_number')}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Garantia até (km)"
                      value={completionForm.warranty_mileage}
                      onChange={handleCompletionFormChange('warranty_mileage')}
                      InputProps={{ inputProps: { min: 0 } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Garantia até (data)"
                      value={completionForm.warranty_until_date}
                      onChange={handleCompletionFormChange('warranty_until_date')}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {selectedService?.status === 'confirmed' && (
            <Button onClick={() => handleUpdateStatus('start')} variant="contained" disabled={updating}>
              {updating ? 'Updating...' : 'Start Work'}
            </Button>
          )}
          {selectedService?.status === 'in_progress' && (
            <Button onClick={() => handleUpdateStatus('complete')} variant="contained" disabled={updating}>
              {updating ? 'Updating...' : 'Complete'}
            </Button>
          )}
          {selectedService && ['pending', 'confirmed', 'in_progress'].includes(selectedService.status) && (
            <Button onClick={() => handleUpdateStatus('cancel')} color="error" variant="outlined" disabled={updating}>
              {updating ? 'Updating...' : 'Cancel Order'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}
