import { Box, Typography } from '@mui/material';
import {
  DirectionsCar as CarIcon,
  BuildCircle as WorkshopIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';

const features = [
  { icon: <CarIcon sx={{ fontSize: 28 }} />, title: 'Vehicle Management', desc: 'Track and manage all your vehicles in one place' },
  { icon: <WorkshopIcon sx={{ fontSize: 28 }} />, title: 'Find Workshops', desc: 'Connect with trusted workshops near you' },
  { icon: <SecurityIcon sx={{ fontSize: 28 }} />, title: 'Service History', desc: 'Keep a complete record of all services performed' },
  { icon: <SpeedIcon sx={{ fontSize: 28 }} />, title: 'Real-time Updates', desc: 'Stay informed on your vehicle service status' },
];

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
          justifyContent: 'center',
          width: '50%',
          bgcolor: '#55AEF1',
          color: '#FFFFFF',
          px: { md: 6, lg: 10 },
          py: 8,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decoration */}
        <Box
          sx={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          }}
        />

        {/* Content */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              mb: 1,
              letterSpacing: '-0.02em',
              color: '#FFFFFF',
            }}
          >
            Drive<span style={{ color: '#E0F2FE' }}>Pluss</span>
          </Typography>

          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255,255,255,0.85)',
              fontWeight: 400,
              mb: 6,
              maxWidth: 400,
              lineHeight: 1.6,
            }}
          >
            The complete platform to manage your vehicles and connect with the best workshops.
          </Typography>

          {/* Feature list */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {features.map((feature) => (
              <Box
                key={feature.title}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    flexShrink: 0,
                  }}
                >
                  {feature.icon}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', mb: 0.3, color: '#FFFFFF' }}>
                    {feature.title}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem' }}>
                    {feature.desc}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Right Panel — Form */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: { xs: '100%', md: '50%' },
          height: '100%',
          bgcolor: '#FFFFFF',
          px: { xs: 3, sm: 6, md: 8, lg: 10 },
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
            color: '#0F172A',
          }}
        >
          Drive<span style={{ color: '#55AEF1' }}>Pluss</span>
        </Typography>

        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AuthLayout;