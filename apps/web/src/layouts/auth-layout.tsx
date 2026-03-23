import { Box, Typography } from '@mui/material';
import { Car } from 'lucide-react';
import loginImage from '../assets/login-image.jpg';

const AuthLayout = ({ children }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Left Panel — Branding */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          width: '700px',
          flexShrink: 0,
          bgcolor: '#0E71AE',
          color: '#FFFFFF',
          px: 5,
          pt: 5,
          pb: 0,
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
          <Box
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              borderRadius: 2,
              p: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Car size={28} color="#FFFFFF" />
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: '#FFFFFF', letterSpacing: '-0.01em' }}>
            Drive<span style={{ color: '#BFEFFF' }}>Pluss</span>
          </Typography>
        </Box>

        {/* Title */}
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.3,
            mb: 4,
            maxWidth: 340,
            fontSize: '1.8rem',
          }}
        >
          Take your maintenance to the next level
        </Typography>

        {/* Image */}
        <Box
          component="img"
          src={loginImage}
          alt="Car maintenance"
          sx={{
            width: '100%',
            height: '600px',
            borderRadius: '12px 12px 0 0',
            objectFit: 'cover',
          }}
        />
      </Box>

      {/* Right Panel — Form */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          height: '100%',
          bgcolor: '#FFFFFF',
          px: { xs: 3, sm: 6 },
          py: { xs: 4, md: 6 },
          overflowY: 'auto',
        }}
      >
        {/* Mobile-only logo */}
        <Typography
          variant="h5"
          sx={{
            display: { xs: 'block', md: 'none' },
            fontWeight: 800,
            mb: 4,
            color: '#0E71AE',
          }}
        >
          Drive<span style={{ color: '#0E71AE' }}>Pluss</span>
        </Typography>

        <Box sx={{ width: '100%', maxWidth: 486 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AuthLayout;