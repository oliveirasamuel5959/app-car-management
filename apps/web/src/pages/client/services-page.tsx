import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import { useRealtime } from '../../context/realtime-context';
import { serviceService } from '../../services/service-service';
import ConfirmDialog from '../../components/ui/confirm-dialog';
import PaymentDialog from '../../components/payments/payment-dialog';
import RatingModal from './rating-modal';
import {
  STATUS_META,
  formatBRL,
  formatDateTime,
  formatDateShort,
} from './service-status';

interface Service {
  id: number;
  tenant_id: string;
  workshop_id: number;
  vehicle_id: number;
  name: string;
  description: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rejected' | 'paid' | 'refunded';
  progress_percentage: number;
  checkin_date: string;
  estimated_finish_date: string;
  finished_at: string | null;
  estimated_hours: number;
  actual_hours: number | null;
  estimated_cost: number;
  final_cost: number | null;
  workshop_notes: string;
}

function Fact({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <Box>
      <Typography
        variant="overline"
        sx={{ color: 'text.secondary', letterSpacing: '0.08em', lineHeight: 1.2, display: 'block' }}
      >
        {label}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          fontWeight: 600,
          mt: 0.25,
          fontVariantNumeric: 'tabular-nums',
          color: emphasize ? 'success.dark' : 'text.primary',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default function ServicesPage() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [payingService, setPayingService] = useState<Service | null>(null);
  const [reviewingService, setReviewingService] = useState<Service | null>(null);

  const reloadServices = async () => {
    const response = await serviceService.getMyServices();
    setServices(Array.isArray(response) ? response : []);
  };

  useEffect(() => {
    const fetchServices = async () => {
      try {
        await reloadServices();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  // Live reload when the workshop changes an order status
  const { subscribe } = useRealtime();
  useEffect(() => {
    return subscribe('order_status_change', () => {
      reloadServices().catch(console.error);
    });
  }, [subscribe]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (services.length === 0) {
    return (
      <Box sx={{ py: 10, px: 3, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Nenhum serviço por aqui
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Quando você agendar uma visita, o andamento do serviço aparece nesta página.
        </Typography>
        <Button
          variant="contained"
          size="small"
          sx={{ mt: 3 }}
          onClick={() => navigate('/client/scheduling')}
        >
          Fazer um agendamento
        </Button>
      </Box>
    );
  }

  const sortedServices = [...services].sort((left, right) => {
    if (String(left.id) === serviceId) return -1;
    if (String(right.id) === serviceId) return 1;
    return new Date(right.checkin_date).getTime() - new Date(left.checkin_date).getTime();
  });

  const handleAccept = async (id: number) => {
    try {
      setSubmittingId(id);
      await serviceService.acceptServiceOrder(id);
      await reloadServices();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleCancel = async (id: number) => {
    try {
      setSubmittingId(id);
      await serviceService.cancelServiceOrder(id);
      await reloadServices();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = async (id: number) => {
    try {
      setSubmittingId(id);
      await serviceService.rejectServiceOrder(id);
      await reloadServices();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingId(null);
      setConfirmRejectOpen(false);
    }
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: 'background.default', p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Meus Serviços
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Acompanhe o andamento do serviço do seu veículo.
        </Typography>
      </Box>

      <Stack spacing={2}>
        {sortedServices.map((service) => {
          const meta = STATUS_META[service.status] ?? STATUS_META.pending;
          return (
            <Paper
              key={service.id}
              elevation={0}
              sx={{
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderLeft: '4px solid',
                borderLeftColor: meta.color,
                p: 3,
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 2,
                  flexWrap: 'wrap',
                }}
              >
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ color: 'text.secondary', letterSpacing: '0.08em', lineHeight: 1 }}
                  >
                    OS #{service.id}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {service.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {service.description}
                  </Typography>
                </Box>
                <Chip
                  label={meta.label}
                  size="small"
                  sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 600 }}
                />
              </Box>

              {/* Pending actions */}
              {service.status === 'pending' && (
                <Stack spacing={1} sx={{ mt: 2 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button
                      variant="contained"
                      size="small"
                      disabled={submittingId === service.id}
                      onClick={() => handleAccept(service.id)}
                    >
                      {submittingId === service.id ? 'Aceitando...' : 'Aceitar orçamento'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      disabled={submittingId === service.id}
                      onClick={() => {
                        setRejectingId(service.id);
                        setConfirmRejectOpen(true);
                      }}
                    >
                      Recusar orçamento
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      disabled={submittingId === service.id}
                      onClick={() => handleCancel(service.id)}
                    >
                      Cancelar pedido
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Decida com base no custo estimado e na data de conclusão abaixo.
                  </Typography>
                </Stack>
              )}

              {/* Facts */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                  gap: 2,
                  mt: 3,
                  pt: 3,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Fact label="Entrada" value={formatDateTime(service.checkin_date)} />
                <Fact
                  label="Previsão de conclusão"
                  value={formatDateShort(service.estimated_finish_date)}
                  emphasize={service.status === 'pending'}
                />
                <Fact
                  label="Custo estimado"
                  value={formatBRL(service.estimated_cost)}
                  emphasize={service.status === 'pending'}
                />
                <Fact
                  label="Custo final"
                  value={service.final_cost != null ? formatBRL(service.final_cost) : '—'}
                  emphasize={service.status === 'completed'}
                />
              </Box>

              {/* Workshop notes */}
              <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
                <Typography
                  variant="overline"
                  sx={{ color: 'text.secondary', letterSpacing: '0.08em', lineHeight: 1, display: 'block' }}
                >
                  Observações da oficina
                </Typography>
                {service.workshop_notes ? (
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 1,
                      color: 'text.primary',
                      borderLeft: '2px solid',
                      borderColor: 'secondary.main',
                      pl: 1.5,
                      fontStyle: 'italic',
                    }}
                  >
                    {service.workshop_notes}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Sem observações até o momento.
                  </Typography>
                )}
              </Box>

              {/* Payment / review actions */}
              {(service.status === 'completed' || service.status === 'paid') && (
                <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
                  {service.status === 'completed' && service.final_cost != null && (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => setPayingService(service)}
                    >
                      Pagar {formatBRL(service.final_cost)}
                    </Button>
                  )}
                  {service.status === 'paid' && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setReviewingService(service)}
                    >
                      Avaliar oficina
                    </Button>
                  )}
                </Stack>
              )}
            </Paper>
          );
        })}
      </Stack>

      <ConfirmDialog
        open={confirmRejectOpen}
        title="Recusar orçamento"
        message={
          rejectingId !== null
            ? `Tem certeza que deseja recusar o orçamento da OS #${rejectingId}? O pedido será encerrado.`
            : ''
        }
        confirmLabel="Recusar"
        cancelLabel="Voltar"
        destructive
        loading={submittingId === rejectingId}
        onConfirm={() => {
          if (rejectingId !== null) {
            handleReject(rejectingId);
          }
        }}
        onClose={() => setConfirmRejectOpen(false)}
      />

      <PaymentDialog
        open={payingService !== null}
        serviceOrder={payingService}
        onClose={() => setPayingService(null)}
        onPaid={() => {
          setPayingService(null);
          reloadServices().catch(console.error);
        }}
      />

      <RatingModal
        open={reviewingService !== null}
        scheduleId={null}
        serviceOrderId={reviewingService?.id ?? null}
        scheduleLabel={
          reviewingService
            ? `OS #${reviewingService.id} — ${reviewingService.name}`
            : ''
        }
        existing={null}
        onClose={() => setReviewingService(null)}
        onSaved={() => {
          reloadServices().catch(console.error);
        }}
      />
    </Box>
  );
}
