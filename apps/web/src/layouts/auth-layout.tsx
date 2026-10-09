import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { BrandLogo } from '../components/brand/brand-logo';
import loginImage from '../assets/login-image.jpg';

const AuthLayout = ({ children }: { children: ReactNode }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
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
        <Box sx={{ mb: 4 }}>
          <BrandLogo tone="light" size="lg" />
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
          justifyContent: { xs: 'flex-start', md: 'center' },
          flex: 1,
          minHeight: '100vh',
          bgcolor: '#FFFFFF',
          px: { xs: 3, sm: 6 },
          py: { xs: 6, md: 6 },
          overflowY: 'auto',
        }}
      >
        {/* Mobile-only logo */}
        <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 4 }}>
          <BrandLogo size="lg" />
        </Box>

        <Box sx={{ width: '100%', maxWidth: 486 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AuthLayout;