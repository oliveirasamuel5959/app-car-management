import { useNavigate } from 'react-router-dom';
import { Box, Button, Chip, Paper, Typography } from '@mui/material';

export interface CarData {
  id: number;
  brand: string;
  model: string;
  year: number;
  plate: string;
}

interface CarCardProps {
  carData: CarData;
}

const CarCard = ({ carData }: CarCardProps) => {
  const navigate = useNavigate();

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderLeft: '4px solid',
        borderLeftColor: 'primary.main',
        p: 3,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: 3,
      }}
    >
      {/* Plate badge — the vehicle's identity, styled like a Mercosul plate */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          borderRadius: 2,
          px: 3,
          py: 1.5,
          minWidth: 180,
          boxShadow: 'inset 0 0 0 3px rgba(255,255,255,0.28)',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            letterSpacing: '0.14em',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {carData.plate}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="overline"
          sx={{ color: 'text.secondary', letterSpacing: '0.08em', lineHeight: 1, display: 'block' }}
        >
          Seu veículo
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }} noWrap>
          {carData.brand} {carData.model}
        </Typography>
        <Chip
          label={`Ano ${carData.year}`}
          size="small"
          sx={{ mt: 1, fontWeight: 600, bgcolor: 'action.hover', color: 'text.secondary' }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          size="small"
          onClick={() => navigate('/client/service-history')}
        >
          Histórico de manutenção
        </Button>
      </Box>
    </Paper>
  );
};

export default CarCard;
