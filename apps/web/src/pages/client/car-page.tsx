import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';

import { useAuth } from '../../context/auth-context';
import travelingSvg from '../../assets/undraw_traveling_yhxq.svg';
import { carService } from '../../services/car-service';
import CarCard, { type CarData } from '../../components/cars/car-card';

export function CarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [carData, setCarData] = useState<CarData[]>([]);
  const [loadingState, setLoadingState] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCars = async () => {
      try {
        setLoadingState(true);
        const data = await carService.getAllCars();
        setCarData(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('CarList error:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar seus veículos',
        );
      } finally {
        setLoadingState(false);
      }
    };

    fetchCars();
  }, []);

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Meu Carro
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {user?.name
              ? `Olá, ${user.name.split(' ')[0]}. Seus veículos em um só lugar.`
              : 'Seus veículos em um só lugar.'}
          </Typography>
        </Box>
        {!loadingState && !error && carData.length > 0 && (
          <Button variant="contained" size="small" onClick={() => navigate('/cars/new')}>
            Adicionar veículo
          </Button>
        )}
      </Box>

      {/* States */}
      {loadingState ? (
        <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', p: 3 }}>
          <Skeleton variant="text" width={140} />
          <Skeleton variant="text" width={280} sx={{ mt: 1 }} />
          <Skeleton variant="rounded" width={180} height={44} sx={{ mt: 2 }} />
        </Paper>
      ) : error ? (
        <Paper
          elevation={0}
          sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', p: 6, textAlign: 'center' }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Algo deu errado
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Não conseguimos carregar seus veículos. {error}
          </Typography>
          <Button variant="contained" size="small" sx={{ mt: 3 }} onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        </Paper>
      ) : carData.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
          <Box
            component="img"
            src={travelingSvg}
            alt="Carro na estrada"
            sx={{ width: 200, mx: 'auto', display: 'block', opacity: 0.9 }}
          />
          <Typography variant="h6" sx={{ fontWeight: 700, mt: 4 }}>
            Você ainda não cadastrou nenhum veículo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 420, mx: 'auto' }}>
            Adicione seu primeiro carro e acompanhe serviços, agendamentos e o
            histórico de manutenção em um só lugar.
          </Typography>
          <Button variant="contained" size="small" sx={{ mt: 3 }} onClick={() => navigate('/cars/new')}>
            Adicionar meu primeiro carro
          </Button>
        </Box>
      ) : (
        <Stack spacing={2}>
          {carData.map((car) => (
            <CarCard key={car.id} carData={car} />
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default CarPage;
