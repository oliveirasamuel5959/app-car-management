import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardHeader,
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
} from '@mui/material';

import { Edit as EditIcon, Visibility as ViewIcon, Add as AddIcon } from '@mui/icons-material';

import { useAuth } from '../../context/auth-context';
import { serviceService } from '../../services/service-service';

interface Service {
  id: number;
  name: string;
  description?: string;
  status: string;
  vehicle_id: number;
  workshop_id: number;
  checkin_date: string;
  estimated_finish_date?: string;
  progress_percentage: number;
  estimated_cost?: number;
  final_cost?: number;
}

function getStatusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'pending':
      return 'warning';
    case 'confirmed':
      return 'primary';
    case 'cancelled':
      return 'error';
    default:
      return 'default';
  }
}

export default function WorkshopOrdersPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchServices();
  }, [user]);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await serviceService.getServices();
      if (Array.isArray(data)) {
        setServices(data);
      } else {
        setServices([]);
      }
    } catch (err) {
      console.error('Error fetching services:', err);
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = (service: Service) => {
    setSelectedService(service);
    setEditNotes(service.workshop_notes || '');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedService(null);
  };

  const refreshSelectedService = (updatedService: Service) => {
    setServices((prev) => prev.map((service) => (service.id === updatedService.id ? updatedService : service)));
    setSelectedService(updatedService);
  };

  const handleUpdateStatus = async (action: 'start' | 'complete' | 'cancel') => {
    if (!selectedService) return;

    try {
      setUpdating(true);
      const payload = { workshop_notes: editNotes };
      const updatedService = action === 'start'
        ? await serviceService.startServiceOrder(selectedService.id, payload)
        : action === 'complete'
          ? await serviceService.completeServiceOrder(selectedService.id, payload)
          : await serviceService.cancelServiceOrder(selectedService.id, payload);

      refreshSelectedService(updatedService);
    } catch (err: any) {
      console.error('Error updating service:', err);
    } finally {
      setUpdating(false);
    }
  };


  // if (editStatus === selectedService.status) {
  //   handleCloseDialog();
  //   return;
  // }

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
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Orders Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => window.location.href = '/workshop/orders/new'}
        >
          New Order
        </Button>
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
              No orders yet. Create your first order!
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
                    <Typography variant="caption" color="textSecondary">
                      Vehicle ID: {service.vehicle_id}
                    </Typography>
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
                <Typography variant="subtitle2" color="textSecondary">
                  Service Name
                </Typography>
                <Typography variant="body1">
                  {selectedService.name}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Description
                </Typography>
                <Typography variant="body2">
                  {selectedService.description || 'No description'}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Status
                </Typography>
                <Chip label={selectedService.status.replace('_', ' ').toUpperCase()} color={getStatusColor(selectedService.status) as any} size="small" />
              </Grid>

              {/* Editable Workshop Notes */}
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
                <Typography variant="subtitle2" color="textSecondary">
                  Progress
                </Typography>
                <Typography variant="body1">
                  {selectedService.progress_percentage}%
                </Typography>
              </Grid>

            </Grid>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancel
          </Button>

          <Button
            onClick={handleCloseDialog}
          >
            Close
          </Button>

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
