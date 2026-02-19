import { Box, Button, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CarKeepLogo from '../assets/carkeep-logo.svg';

const Home = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm">
      <Box 
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 4,
        }}
      >
        <img 
          src={CarKeepLogo} 
          alt="Car Management System Logo"
          style={{
            height: '200px',
            marginBottom: '2rem'
          }}
        />
        <Typography 
          variant="h3" 
          component="h1"
          sx={{ 
            mb: 2, 
            textAlign: 'center',
            color: 'secondary.main'
          }}
        >
          Welcome to Car Management System
        </Typography>
        <Typography 
          variant="body1"
          sx={{ 
            mb: 2, 
            textAlign: 'center',
            color: 'secondary.light'
          }}
        >
          Your all-in-one solution for managing your car fleet. Track maintenance, schedule services, and keep your vehicles running smoothly with ease.  
        </Typography>
        <Button 
          variant="contained" 
          size="large"
          onClick={() => navigate('/login')}
          sx={{ mt: 2 }}
        >
          Get Started
        </Button>
      </Box>
    </Container>
  );
};

export default Home;