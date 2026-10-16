import { useEffect, useRef, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

import { useRealtime } from '../../context/realtime-context';
import { getStatusMeta } from '../../lib/status';

/**
 * Global toasts for realtime events. Mounted once inside RealtimeProvider.
 */
export default function RealtimeToasts() {
  const { subscribe } = useRealtime();
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribeOrder = subscribe('order_status_change', (event) => {
      const label = getStatusMeta(event.new_status).label;
      setToast(`Pedido #${event.service_order_id} atualizado para: ${label}`);
    });
    const unsubscribeSchedule = subscribe('schedule_status_change', (event) => {
      const label = getStatusMeta(event.new_status).label;
      setToast(`Agendamento #${event.schedule_id}: ${label}`);
    });
    const unsubscribeRating = subscribe('rating_received', (event) => {
      setToast(`Nova avaliação recebida: ${event.rating} estrelas`);
    });
    return () => {
      unsubscribeOrder();
      unsubscribeSchedule();
      unsubscribeRating();
    };
  }, [subscribe]);

  useEffect(() => {
    if (toast === null) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 6000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast]);

  return (
    <Snackbar
      open={toast !== null}
      autoHideDuration={6000}
      onClose={() => setToast(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity="info" variant="filled" onClose={() => setToast(null)}>
        {toast}
      </Alert>
    </Snackbar>
  );
}
