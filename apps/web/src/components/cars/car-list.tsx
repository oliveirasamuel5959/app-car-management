import { useState, useEffect } from 'react';
import { 
  Grid, 
  Typography, 
  Box, 
  Alert,
  Button 
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import TripCard from './car-card';
import { useNavigate } from 'react-router-dom';
import { carService } from '../../services/car-service';
import CarCard from './car-card';

const CarList = ({ WelcomeMessage, ErrorState }) => {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCars = async () => {
      try {
        setLoading(true);
        const data = await carService.getAllCars();
        console.log('CarList received data:', data); // Debug log
        
        if (!data || !data.cars) {
          console.error('Invalid data format:', data);
          setError('Unexpected data format received');
          return;
        }
        
        setCars(data.cars);
      } catch (err) {
        console.error('CarList error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCars();
  }, []);

  // Loading state with skeleton cards
  if (loading) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3].map((skeleton) => (
          <Grid item xs={12} sm={6} md={4} key={skeleton}>
            <TripCard loading={true} />
          </Grid>
        ))}
      </Grid>
    );
  }

  // Error state
  if (error) {
    return <ErrorState />;
  }

  // Empty state
  if (cars.length === 0) {
    return <WelcomeMessage />;
  }

  // Loaded state with cars
  return (
    <Grid container spacing={3}>
      {cars.map((car) => (
        <Grid item xs={12} sm={6} md={4} key={car.id}>
          <CarCard car={car} />
        </Grid>
      ))}
      <Grid item xs={12} sm={6} md={4}>
        <Button
          variant="outlined"
          fullWidth
          sx={{ 
            height: '100%', 
            minHeight: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => navigate('/trips/new')}
        >
          <AddIcon sx={{ mb: 1 }} />
          <Typography>Add New Trip</Typography>
        </Button>
      </Grid>
    </Grid>
  );
};

export default CarList;
