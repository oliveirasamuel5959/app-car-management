import { useState, useEffect } from 'react';
import { Box, Button, Typography, Container, CircularProgress, Alert } from '@mui/material';
import AddCarModal from '../components/cars/add-car-modal';
import { carService } from '../services/car-service';
import { useNavigate } from 'react-router-dom';

export function AddCarPage() {
  const navigate = useNavigate();
  const [openModal, setOpenModal] = useState(false);
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  const handleCarAddedSuccess = () => {
    // Refresh the car list
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    const fetchCars = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await carService.getAllCars();
        setCars(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load cars';
        setError(errorMessage);
        console.error('Error fetching cars:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCars();
  }, [refreshKey]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Section */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <div>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
            My Vehicles
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage your car collection
          </Typography>
        </div>
      </Box>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : cars && cars.length > 0 ? (
        <Box>
          <CarList cars={cars} />
        </Box>
      ) : (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            backgroundColor: '#F9FAFB',
            borderRadius: 2,
            border: '1px solid #E5E7EB',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            No vehicles yet
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Get started by adding your first car to the collection
          </Typography>
          <Button
            variant="contained"
            onClick={handleOpenModal}
            sx={{
              backgroundColor: '#4F46E5',
              '&:hover': { backgroundColor: '#3730A3' },
              textTransform: 'none',
            }}
          >
            Add Your First Car
          </Button>
        </Box>
      )}

      {/* Add Car Modal */}
      <AddCarModal
        open={openModal}
        onClose={handleCloseModal}
        onSuccess={handleCarAddedSuccess}
      />
    </Container>
  );
}