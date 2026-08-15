import { useEffect, useRef, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

import { useRealtime } from '../../context/realtime-context';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  in_progress: 'Em Progresso',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  pendente: 'Pendente',
  visualizado: 'Visualizado',
  aceito: 'Aceito',
  recusado: 'Recusado',
};

/**
 * Global toasts for realtime events. Mounted once inside RealtimeProvider.
 */
export default function RealtimeToasts() {
  const { subscribe } = useRealtime();
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribeOrder = subscribe('order_status_change', (event) => {
      const label = STATUS_LABELS[event.new_status] ?? event.new_status;
      setToast(`Pedido #${event.service_order_id} atualizado para: ${label}`);
    });
    const unsubscribeSchedule = subscribe('schedule_status_change', (event) => {
      const label = STATUS_LABELS[event.new_status] ?? event.new_status;
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
