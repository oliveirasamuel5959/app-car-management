import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Grid,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Stack,
} from '@mui/material';

import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';

import { useAuth } from '../../context/auth-context';
import { serviceService } from '../../services/service-service';
import { workshopClientService } from '../../services/workshop-client-service';
import type { WorkshopClient } from '../../services/workshop-client-service';

interface FormData {
  workshop_client_id: number | '';
  name: string;
  description: string;
  status: string;
  progress_percentage: number;
  checkin_date: string;
  estimated_finish_date: string;
  estimated_hours: number | '';
  estimated_cost: number | '';
  workshop_notes: string;
}

const initialFormData: FormData = {
  workshop_client_id: '',
  name: '',
  description: '',
  status: 'pending',
  progress_percentage: 0,
  checkin_date: '',
  estimated_finish_date: '',
  estimated_hours: '',
  estimated_cost: '',
  workshop_notes: '',
};

export default function WorkshopServicesPage() {
  const { user } = useAuth();
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [clients, setClients] = useState<WorkshopClient[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await workshopClientService.getClients();
        setClients(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load clients:', err);
      }
    };
    fetchClients();
  }, []);

  const handleOpenDialog = () => {
    setOpenDialog(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData(initialFormData);
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'progress_percentage' || name === 'estimated_hours' || name === 'estimated_cost' || name === 'workshop_client_id') {
      setFormData((prev) => ({
        ...prev,
        [name]: value === '' ? '' : Number(value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const validateForm = () => {
    if (!formData.workshop_client_id) {
      setError('Please select a client');
      return false;
    }
    if (!formData.name.trim()) {
      setError('Service name is required');
      return false;
    }
    if (!formData.checkin_date) {
      setError('Check-in date is required');
      return false;
    }
    if (typeof formData.progress_percentage === 'number') {
      if (formData.progress_percentage < 0 || formData.progress_percentage > 100) {
        setError('Progress percentage must be between 0 and 100');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      const submitData = {
        workshop_client_id: formData.workshop_client_id as number,
        name: formData.name,
        description: formData.description || undefined,
        status: formData.status,
        progress_percentage: formData.progress_percentage,
        checkin_date: formData.checkin_date,
        estimated_finish_date: formData.estimated_finish_date || undefined,
        estimated_hours: formData.estimated_hours === '' ? undefined : formData.estimated_hours,
        estimated_cost: formData.estimated_cost === '' ? undefined : formData.estimated_cost,
        workshop_notes: formData.workshop_notes || undefined,
      };

      await serviceService.createService(submitData);

      setSuccess('Service created successfully!');
      setOpenDialog(false);
      setFormData(initialFormData);

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create service');
      console.error('Error creating service:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">
          Services Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Create Service
        </Button>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Card>
        <CardHeader title="Create New Service" />
        <Divider />
        <CardContent>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            fullWidth
          >
            Click to Create a Service
          </Button>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            Use the dialog to create a new service order for your workshop
          </Typography>
        </CardContent>
      </Card>

      {/* Create Service Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Create New Service
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Client*"
              select
              fullWidth
              required
              value={formData.workshop_client_id}
              onChange={handleInputChange}
              name="workshop_client_id"
            >
              {clients.length === 0 && (
                <MenuItem value="" disabled>
                  No clients found. Add clients first.
                </MenuItem>
              )}
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name} - {client.vehicle_brand} {client.vehicle_model} ({client.vehicle_plate})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Service Name*"
              fullWidth
              required
              value={formData.name}
              onChange={handleInputChange}
              name="name"
              placeholder="e.g., Oil Change, Engine Repair"
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={handleInputChange}
              name="description"
            />

            <TextField
              label="Status"
              select
              fullWidth
              value={formData.status}
              onChange={handleInputChange}
              name="status"
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="in_progress">In Progress</MenuItem>
              <MenuItem value="waiting_parts">Waiting Parts</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
            </TextField>

            <TextField
              label="Progress Percentage"
              type="number"
              fullWidth
              value={formData.progress_percentage}
              onChange={handleInputChange}
              name="progress_percentage"
              InputProps={{ inputProps: { min: 0, max: 100 } }}
            />

            <TextField
              label="Check-in Date*"
              type="datetime-local"
              fullWidth
              required
              value={formData.checkin_date}
              onChange={handleInputChange}
              name="checkin_date"
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Estimated Finish Date"
              type="datetime-local"
              fullWidth
              value={formData.estimated_finish_date}
              onChange={handleInputChange}
              name="estimated_finish_date"
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Estimated Hours"
              type="number"
              fullWidth
              value={formData.estimated_hours}
              onChange={handleInputChange}
              name="estimated_hours"
              inputProps={{ step: '0.5', min: 0 }}
            />

            <TextField
              label="Estimated Cost"
              type="number"
              fullWidth
              value={formData.estimated_cost}
              onChange={handleInputChange}
              name="estimated_cost"
              inputProps={{ step: '0.01', min: 0 }}
            />

            <TextField
              label="Workshop Notes"
              fullWidth
              multiline
              rows={3}
              value={formData.workshop_notes}
              onChange={handleInputChange}
              name="workshop_notes"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Service'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
