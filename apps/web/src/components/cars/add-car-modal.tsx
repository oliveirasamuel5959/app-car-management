import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import { Form } from '../ui/form';
import { carService } from '../../services/car-service';
import { useNavigate } from 'react-router-dom';

interface AddCarModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface CarFormData {
  brand: string;
  model: string;
  year: number;
  plate: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function AddCarModal({ open, onClose, onSuccess }: AddCarModalProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CarFormData>({
    brand: '',
    model: '',
    year: 0,
    plate: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.plate.trim()) {
      newErrors.plate = 'Plate number is required';
    } else if (formData.plate.trim().length < 3) {
      newErrors.plate = 'Plate must be at least 3 characters';
    }

    if (!formData.model.trim()) {
      newErrors.model = 'Model is required';
    }

    if (!formData.year) {
      newErrors.year = 'Year is required';
    } else if (isNaN(Number(formData.year))) {
      newErrors.year = 'Year must be a number';
    } else if (Number(formData.year) < 1900 || Number(formData.year) > new Date().getFullYear()) {
      newErrors.year = `Year must be between 1900 and ${new Date().getFullYear()}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const carData = {
        brand: formData.brand.trim(),
        model: formData.model.trim(),
        year: Number(formData.year),
        plate: formData.plate.trim(),
      };

      console.log('Submitting car data:', carData); // Debug log

      await carService.createCar(carData);

      // Reset form
      setFormData({
        brand: '',
        model: '',
        year: 0,
        plate: '',
      });

      onSuccess?.();
      onClose();

      navigate('/client/dashboard'); // Redirect to dashboard after adding a car

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add car';
      setApiError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!loading) {
      setFormData({
        brand: '',
        model: '',
        year: 0,
        plate: '',
      });
      setErrors({});
      setApiError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
        Add New Car
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Brand Field */}
            <TextField
              name="brand"
              label="Brand"
              value={formData.brand}
              onChange={handleInputChange}
              placeholder="e.g., Chevrolet"
              error={!!errors.brand}
              helperText={errors.brand}
              fullWidth
              disabled={loading}
              variant="outlined"
              size="small"
            />

            {/* Model Field */}
            <TextField
              name="model"
              label="Car Model"
              value={formData.model}
              onChange={handleInputChange}
              placeholder="e.g., Tracker"
              error={!!errors.model}
              helperText={errors.model}
              fullWidth
              disabled={loading}
              variant="outlined"
              size="small"
            />

            {/* Year Field */}
            <TextField
              name="year"
              label="Year"
              type="number"
              value={formData.year}
              onChange={handleInputChange}
              placeholder="e.g., 2022"
              error={!!errors.year}
              helperText={errors.year}
              fullWidth
              disabled={loading}
              variant="outlined"
              size="small"
              inputProps={{ min: 1900, max: new Date().getFullYear() }}
            />

            <TextField
              name="plate"
              label="Plate Number"
              value={formData.plate}
              onChange={handleInputChange}
              placeholder="e.g., ABC-1234"
              error={!!errors.plate}
              helperText={errors.plate}
              fullWidth
              disabled={loading}
              variant="outlined"
              size="small"
              inputProps={{ min: 1900, max: new Date().getFullYear() }}
            />

          </Box>
        </Form>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          sx={{
            backgroundColor: '#4F46E5',
            '&:hover': { backgroundColor: '#3730A3' },
          }}
        >
          {loading ? <CircularProgress size={24} /> : 'Add Car'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
