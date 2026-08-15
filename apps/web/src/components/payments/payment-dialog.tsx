import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
} from '@mui/material';

import { formatBRL } from '../../pages/client/service-status';
import type { ServiceOrder } from '../../services/service-service';
import { paymentService, type PaymentCheckout } from '../../services/payment-service';

interface PaymentDialogProps {
  open: boolean;
  /** Order being paid; null while the dialog is closed. */
  serviceOrder: ServiceOrder | null;
  onClose: () => void;
  /** Called after the backend confirms the payment so the parent can refresh. */
  onPaid: () => void;
}

export default function PaymentDialog({
  open,
  serviceOrder,
  onClose,
  onPaid,
}: PaymentDialogProps) {
  const [checkout, setCheckout] = useState<PaymentCheckout | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && serviceOrder) {
      setCheckout(null);
      setError(null);
      setLoading(true);
      paymentService
        .createCheckout(serviceOrder.id)
        .then(setCheckout)
        .catch((err: unknown) =>
          setError(err instanceof Error ? err.message : 'Erro ao iniciar o pagamento'),
        )
        .finally(() => setLoading(false));
    }
  }, [open, serviceOrder]);

  // Redirects the browser to the Stripe-hosted payment page; Stripe returns
  // to /payments/return, which confirms the payment and calls onPaid.
  const handlePay = () => {
    if (!checkout) return;
    window.location.href = checkout.checkout_url;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Pagamento do serviço</DialogTitle>
      <Divider />
      <DialogContent sx={{ mt: 1 }}>
        {serviceOrder && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            OS #{serviceOrder.id} — {serviceOrder.name}
          </Typography>
        )}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={28} />
          </Box>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {!loading && checkout && (
          <Typography variant="body2" sx={{ mb: 2 }}>
            Você será redirecionado para a página de pagamento segura da Stripe
            para pagar{' '}
            <strong>{formatBRL(checkout.amount_cents / 100)}</strong>.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={loading || !checkout}
          onClick={handlePay}
        >
          {loading ? 'Preparando…' : 'Pagar com Stripe'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
