import { useEffect, useState } from 'react';
import {
  Container,
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
  Stack,
  Alert,
  Divider,
  IconButton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { workshopClientService } from '../../services/workshop-client-service';
import type { WorkshopClient, WorkshopClientCreate } from '../../services/workshop-client-service';

const initialFormData: WorkshopClientCreate = {
  name: '',
  email: '',
  phone: '',
  vehicle_brand: '',
  vehicle_model: '',
  vehicle_year: new Date().getFullYear(),
  vehicle_plate: '',
};

export default function WorkshopClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<WorkshopClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<WorkshopClientCreate>(initialFormData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await workshopClientService.getClients();
      setClients(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    if (name === 'vehicle_year') {
      setFormData((prev) => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Client name is required');
      return;
    }
    if (!formData.vehicle_brand.trim() || !formData.vehicle_model.trim() || !formData.vehicle_plate.trim()) {
      setError('Vehicle brand, model, and plate are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await workshopClientService.createClient(formData);
      setSuccess('Client added successfully!');
      handleCloseDialog();
      fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add client');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (clientId: number) => {
    if (!confirm('Are you sure you want to remove this client?')) return;
    try {
      await workshopClientService.deleteClient(clientId);
      fetchClients();
    } catch (err) {
      console.error('Failed to delete client:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <Box display="flex" justifyContent="center" mt={10}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Clients</Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpenDialog}>
          Add Client
        </Button>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Vehicle</TableCell>
              <TableCell>Plate</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.map((client) => (
              <TableRow
                key={client.id}
                hover
                onClick={() => navigate(`/workshop/clients/${client.id}/orders`)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>{client.name}</TableCell>
                <TableCell>{client.email || '-'}</TableCell>
                <TableCell>{client.phone || '-'}</TableCell>
                <TableCell>
                  {client.vehicle_brand} {client.vehicle_model} ({client.vehicle_year})
                </TableCell>
                <TableCell>{client.vehicle_plate}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {clients.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No clients yet. Click "Add Client" to register your first client.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Client Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Client</DialogTitle>
        <Divider />
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <Typography variant="subtitle2" color="textSecondary">
              Client Information
            </Typography>

            <TextField
              label="Name*"
              fullWidth
              required
              value={formData.name}
              onChange={handleInputChange}
              name="name"
              placeholder="Client full name"
            />

            <TextField
              label="Email"
              fullWidth
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              name="email"
              placeholder="client@email.com"
            />

            <TextField
              label="Phone"
              fullWidth
              value={formData.phone}
              onChange={handleInputChange}
              name="phone"
              placeholder="+55 11 99999-9999"
            />

            <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 1 }}>
              Vehicle Information
            </Typography>

            <TextField
              label="Vehicle Brand*"
              fullWidth
              required
              value={formData.vehicle_brand}
              onChange={handleInputChange}
              name="vehicle_brand"
              placeholder="e.g., Toyota"
            />

            <TextField
              label="Vehicle Model*"
              fullWidth
              required
              value={formData.vehicle_model}
              onChange={handleInputChange}
              name="vehicle_model"
              placeholder="e.g., Corolla"
            />

            <TextField
              label="Vehicle Year*"
              type="number"
              fullWidth
              required
              value={formData.vehicle_year}
              onChange={handleInputChange}
              name="vehicle_year"
              InputProps={{ inputProps: { min: 1900, max: 2100 } }}
            />

            <TextField
              label="Vehicle Plate*"
              fullWidth
              required
              value={formData.vehicle_plate}
              onChange={handleInputChange}
              name="vehicle_plate"
              placeholder="e.g., ABC-1234"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Client'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
