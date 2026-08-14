import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Stack,
  IconButton,
  Tooltip,
  Rating,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import type { WorkshopRating } from '../../services/workshop-rating-service';
import { workshopRatingService } from '../../services/workshop-rating-service';

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function WorkshopRatingsPage() {
  const [ratings, setRatings] = useState<WorkshopRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await workshopRatingService.listReceived();
      setRatings(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar avaliações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 960, mx: 'auto', px: { xs: 2, md: 0 } }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight={700}>
          Avaliações
        </Typography>
        <Tooltip title="Atualizar">
          <IconButton onClick={fetchRatings} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {ratings.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <StarBorderIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhuma avaliação recebida
            </Typography>
            <Typography variant="body2" color="text.disabled">
              As avaliações dos seus clientes aparecerão aqui.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {ratings.map((r) => (
            <Card key={r.id} variant="outlined" sx={{ transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 2 } }}>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Rating value={r.rating} readOnly size="small" />
                    <Typography variant="caption" color="text.disabled">
                      {fmt(r.created_at)}
                    </Typography>
                  </Stack>
                  {r.comment ? (
                    <Typography variant="body2" color="text.secondary">
                      {r.comment}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.disabled" fontStyle="italic">
                      Sem comentário
                    </Typography>
                  )}
                  {r.schedule_id !== null && (
                    <Typography variant="caption" color="text.disabled">
                      Agendamento #{r.schedule_id}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
