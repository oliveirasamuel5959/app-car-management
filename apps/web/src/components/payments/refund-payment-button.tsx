import { useEffect, useState } from 'react';
import { Button, Typography } from '@mui/material';

import ConfirmDialog from '../ui/confirm-dialog';
import { paymentService, type Payment } from '../../services/payment-service';

interface RefundPaymentButtonProps {
  serviceOrderId: number;
  /** Called after a successful refund so the parent can refresh. */
  onRefunded: () => void;
  disabled?: boolean;
}

/**
 * Workshop-side full refund for a paid order. Renders nothing unless the
 * order has a succeeded payment; fetches the payment state itself.
 */
export default function RefundPaymentButton({
  serviceOrderId,
  onRefunded,
  disabled = false,
}: RefundPaymentButtonProps) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setPayment(null);
    setError(null);
    paymentService
      .getPaymentForOrder(serviceOrderId)
      .then((result) => {
        if (active) setPayment(result);
      })
      .catch(() => {
        if (active) setPayment(null);
      });
    return () => {
      active = false;
    };
  }, [serviceOrderId]);

  if (!payment || payment.status !== 'succeeded') {
    return null;
  }

  const handleRefund = async () => {
    setProcessing(true);
    setError(null);
    try {
      await paymentService.refundPayment(payment.id);
      setConfirmOpen(false);
      onRefunded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Falha ao reembolsar');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        color="error"
        size="small"
        disabled={disabled || processing}
        onClick={() => setConfirmOpen(true)}
      >
        {processing ? 'Reembolsando…' : 'Reembolsar pagamento'}
      </Button>
      {error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
          {error}
        </Typography>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title="Reembolsar pagamento"
        message="O valor total será devolvido ao cliente e o serviço será marcado como reembolsado. Deseja continuar?"
        confirmLabel="Reembolsar"
        cancelLabel="Voltar"
        destructive
        loading={processing}
        onConfirm={handleRefund}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}
