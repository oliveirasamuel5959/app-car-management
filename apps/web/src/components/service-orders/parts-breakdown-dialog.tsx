import { useEffect, useState } from 'react';

import {
  Alert,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';

import {
  STATUS_META,
  formatBRL,
  formatDateShort,
  formatDateTime,
} from '../../pages/client/service-status';
import {
  serviceService,
  type ServiceBreakdown,
} from '../../services/service-service';
import PartsBreakdownTable from './parts-breakdown-table';

interface PartsBreakdownDialogProps {
  open: boolean;
  serviceOrderId: number | null;
  onClose: () => void;
}

function statusMeta(status: string) {
  return STATUS_META[status] ?? { label: status, color: '#64748B', bg: '#F1F5F9' };
}

/**
 * Maintenance-history drill-down: fetches the order breakdown and shows the
 * existing order details plus the part-by-part costs, labor, and total.
 */
export default function PartsBreakdownDialog({
  open,
  serviceOrderId,
  onClose,
}: PartsBreakdownDialogProps) {
  const [breakdown, setBreakdown] = useState<ServiceBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || serviceOrderId === null) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setBreakdown(null);

    serviceService
      .getServiceOrderBreakdown(serviceOrderId)
      .then((data) => {
        if (!cancelled) {
          setBreakdown(data as ServiceBreakdown);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Falha ao carregar detalhes');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, serviceOrderId]);

  const meta = breakdown ? statusMeta(breakdown.status) : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        Detalhes da Ordem de Serviço{breakdown ? ` #${breakdown.id}` : ''}
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ mt: 2 }}>
        {loading && (
          <Stack alignItems="center" sx={{ py: 4 }}>
            <CircularProgress />
          </Stack>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && breakdown && meta && (
          <Stack spacing={3}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Serviço
                </Typography>
                <Typography variant="body1">{breakdown.name}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="textSecondary">
                  Status
                </Typography>
                <Chip
                  label={meta.label}
                  size="small"
                  sx={{ color: meta.color, bgcolor: meta.bg, mt: 0.5 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="textSecondary">
                  Entrada
                </Typography>
                <Typography variant="body2">
                  {formatDateTime(breakdown.checkin_date)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="textSecondary">
                  Previsão de conclusão
                </Typography>
                <Typography variant="body2">
                  {breakdown.estimated_finish_date
                    ? formatDateShort(breakdown.estimated_finish_date)
                    : '—'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="textSecondary">
                  Concluído em
                </Typography>
                <Typography variant="body2">
                  {breakdown.finished_at ? formatDateTime(breakdown.finished_at) : '—'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="textSecondary">
                  Custo estimado
                </Typography>
                <Typography variant="body2">
                  {breakdown.estimated_cost !== null &&
                  breakdown.estimated_cost !== undefined
                    ? formatBRL(breakdown.estimated_cost)
                    : '—'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" color="textSecondary">
                  Custo final
                </Typography>
                <Typography variant="body2">
                  {breakdown.final_cost !== null && breakdown.final_cost !== undefined
                    ? formatBRL(breakdown.final_cost)
                    : '—'}
                </Typography>
              </Grid>
              {breakdown.workshop_notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Observações da oficina
                  </Typography>
                  <Typography variant="body2">{breakdown.workshop_notes}</Typography>
                </Grid>
              )}
            </Grid>

            <Divider />

            <PartsBreakdownTable
              parts={breakdown.parts}
              laborDescription={breakdown.labor_description}
              laborCost={breakdown.labor_cost}
              partsCost={breakdown.parts_cost}
              finalCost={breakdown.final_cost}
            />
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
