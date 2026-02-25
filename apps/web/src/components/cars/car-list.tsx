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
  const [car, setCar] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCar = async () => {
      try {
        setLoading(true);
        const data = await carService.getAllCars();
        
        setCar(data);
      } catch (err) {
        console.error('CarList error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCar();
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
  if (car.length === 0) {
    return <WelcomeMessage />;
  }

  // Loaded state with cars
  return (
    <CarCard car={car} />
  );
};

export default CarList;
