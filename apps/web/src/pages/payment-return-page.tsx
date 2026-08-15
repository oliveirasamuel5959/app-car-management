import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';

import { paymentService } from '../services/payment-service';

/**
 * Landing page after the Stripe Checkout redirect. Confirms the payment on
 * the backend (which verifies the session with the provider) and returns the
 * client to their services list. `canceled=1` skips the confirm entirely.
 */
export default function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (searchParams.get('canceled')) {
      navigate('/client/services', { replace: true });
      return;
    }

    const paymentIdParam = searchParams.get('payment_id');
    if (!paymentIdParam) {
      setError('Parâmetros de retorno ausentes. Tente novamente.');
      return;
    }

    paymentService
      .confirmPayment(Number(paymentIdParam))
      .then(() => navigate('/client/services', { replace: true }))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Falha ao confirmar o pagamento'),
      );
  }, [searchParams, navigate]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Box sx={{ textAlign: 'center', maxWidth: 420 }}>
        {error ? (
          <>
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Button variant="contained" onClick={() => navigate('/client/services')}>
              Voltar para Meus Serviços
            </Button>
          </>
        ) : (
          <>
            <CircularProgress size={36} sx={{ mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Confirmando pagamento…
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Aguarde enquanto verificamos o pagamento com a operadora.
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}
