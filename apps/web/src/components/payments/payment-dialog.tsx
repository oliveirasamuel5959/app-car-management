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
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

import { formatBRL } from '../../pages/client/service-status';
import type { ServiceOrder } from '../../services/service-service';
import { paymentService, type PaymentIntent } from '../../services/payment-service';
import { resolvePaymentMode } from './payment-mode';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as
  | string
  | undefined;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

interface PaymentDialogProps {
  open: boolean;
  /** Order being paid; null while the dialog is closed. */
  serviceOrder: ServiceOrder | null;
  onClose: () => void;
  /** Called after the backend confirms the payment so the parent can refresh. */
  onPaid: () => void;
}

interface PayFormProps {
  intent: PaymentIntent;
  onPaid: () => void;
  onError: (message: string) => void;
}

/** Stripe Elements card form — confirms the intent then verifies on the backend. */
function StripeCardForm({ intent, onPaid, onError }: PayFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setProcessing(true);
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        onError('Formulário de cartão indisponível. Recarregue a página.');
        return;
      }
      const result = await stripe.confirmCardPayment(intent.client_secret, {
        payment_method: { card: cardElement },
      });
      if (result.error) {
        onError(result.error.message ?? 'Falha ao processar o pagamento');
        return;
      }
      await paymentService.confirmPayment(intent.payment_id);
      onPaid();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Falha ao confirmar o pagamento');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Box>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5, mb: 2 }}>
        <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
      </Box>
      <Button
        variant="contained"
        fullWidth
        disabled={processing}
        onClick={handlePay}
      >
        {processing ? 'Processando…' : `Pagar ${formatBRL(intent.amount_cents / 100)}`}
      </Button>
    </Box>
  );
}

/** Local mock flow — no Stripe key configured, confirms directly on the backend. */
function MockPayButton({ intent, onPaid, onError }: PayFormProps) {
  const [processing, setProcessing] = useState(false);

  const handleMockPay = async () => {
    setProcessing(true);
    try {
      await paymentService.confirmPayment(intent.payment_id);
      onPaid();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Falha ao confirmar o pagamento');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Button variant="contained" fullWidth disabled={processing} onClick={handleMockPay}>
      {processing ? 'Confirmando…' : `Simular pagamento de ${formatBRL(intent.amount_cents / 100)}`}
    </Button>
  );
}

export default function PaymentDialog({
  open,
  serviceOrder,
  onClose,
  onPaid,
}: PaymentDialogProps) {
  const [intent, setIntent] = useState<PaymentIntent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && serviceOrder) {
      setIntent(null);
      setError(null);
      setLoading(true);
      paymentService
        .createPaymentIntent(serviceOrder.id)
        .then(setIntent)
        .catch((err: unknown) =>
          setError(err instanceof Error ? err.message : 'Erro ao iniciar o pagamento'),
        )
        .finally(() => setLoading(false));
    }
  }, [open, serviceOrder]);

  const mode = resolvePaymentMode(publishableKey);

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
        {!loading && intent && mode === 'stripe' && stripePromise && (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret: intent.client_secret, locale: 'pt-BR' }}
          >
            <StripeCardForm intent={intent} onPaid={onPaid} onError={setError} />
          </Elements>
        )}
        {!loading && intent && mode === 'mock' && (
          <MockPayButton intent={intent} onPaid={onPaid} onError={setError} />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          Cancelar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
