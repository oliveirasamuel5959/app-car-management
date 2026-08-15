import { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from '@mui/material';

import AddCarModal from '../../components/cars/add-car-modal';
import CarCard, { type CarData } from '../../components/cars/car-card';
import { carService } from '../../services/car-service';

export function AddCarPage() {
  const [openModal, setOpenModal] = useState(false);
  const [cars, setCars] = useState<CarData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);
  const handleCarAddedSuccess = () => setRefreshKey((prev) => prev + 1);

  useEffect(() => {
    const fetchCars = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await carService.getAllCars();
        setCars(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Não foi possível carregar seus veículos',
        );
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
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 0.5 }}>
            Meus Veículos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie os carros da sua garagem.
          </Typography>
        </Box>
        <Button variant="contained" size="small" onClick={handleOpenModal}>
          Adicionar veículo
        </Button>
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
      ) : cars.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            backgroundColor: 'background.default',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Nenhum veículo cadastrado
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Adicione seu primeiro carro para começar.
          </Typography>
          <Button variant="contained" size="small" onClick={handleOpenModal}>
            Adicionar meu primeiro carro
          </Button>
        </Box>
      ) : (
        <Stack spacing={2}>
          {cars.map((car) => (
            <CarCard key={car.id} carData={car} />
          ))}
        </Stack>
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
