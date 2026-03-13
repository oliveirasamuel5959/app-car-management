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
  MenuItem,
  Grid,
} from '@mui/material';

import { ArrowBack as ArrowBackIcon, Visibility as ViewIcon } from '@mui/icons-material';

import { serviceService } from '../../services/service-service';
import { workshopClientService } from '../../services/workshop-client-service';
import type { WorkshopClient } from '../../services/workshop-client-service';

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

function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'pending':
      return 'warning';
    case 'approved':
      return 'primary';
    case 'cancelled':
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
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [updating, setUpdating] = useState(false);

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
    setEditStatus(service.status);
    setEditNotes(service.workshop_notes || '');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedService(null);
  };

  const handleUpdateStatus = async () => {
    if (!selectedService) return;

    try {
      setUpdating(true);
      await serviceService.updateService(selectedService.id, {
        status: editStatus,
        workshop_notes: editNotes,
      });

      setServices((prev) =>
        prev.map((s) =>
          s.id === selectedService.id
            ? { ...s, status: editStatus, workshop_notes: editNotes }
            : s
        )
      );
      handleCloseDialog();
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
                      color={getStatusColor(service.status) as any}
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
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
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
                <TextField
                  select
                  fullWidth
                  label="Status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="waiting_parts">Waiting Parts</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </TextField>
              </Grid>

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
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleUpdateStatus} variant="contained" disabled={updating}>
            {updating ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
