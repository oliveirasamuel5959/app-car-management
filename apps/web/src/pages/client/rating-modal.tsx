import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { Star as StarIcon, StarBorder as StarBorderIcon } from '@mui/icons-material';
import type { WorkshopRating } from '../../services/workshop-rating-service';
import { workshopRatingService } from '../../services/workshop-rating-service';

interface RatingModalProps {
  open: boolean;
  /** Schedule being rated (create mode) — null when editing an existing rating. */
  scheduleId: number | null;
  /** Human-readable label for the schedule (type + date). */
  scheduleLabel: string;
  /** Existing rating (edit mode) or null (create mode). */
  existing: WorkshopRating | null;
  onClose: () => void;
  /** Called after a successful create/update/delete so the parent can refresh. */
  onSaved: () => void;
}

/** Pure validation rule for the 0–5 rating — exported for tests. */
export function validateRating(rating: number | null): string | null {
  if (rating === null) return 'Selecione uma nota de 1 a 5 estrelas';
  if (rating < 0 || rating > 5) return 'A nota deve estar entre 0 e 5';
  return null;
}

export default function RatingModal({
  open,
  scheduleId,
  scheduleLabel,
  existing,
  onClose,
  onSaved,
}: RatingModalProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setRating(existing ? existing.rating : null);
      setComment(existing?.comment ?? '');
      setError(null);
    }
  }, [open, existing]);

  const handleSave = async () => {
    const validationError = validateRating(rating);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const trimmedComment = comment.trim() || null;
      if (existing) {
        await workshopRatingService.update(existing.id, {
          rating: rating ?? undefined,
          comment: trimmedComment,
        });
      } else if (scheduleId !== null) {
        await workshopRatingService.create({
          schedule_id: scheduleId,
          rating: rating ?? 0,
          comment: trimmedComment,
        });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar avaliação');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    setSubmitting(true);
    setError(null);
    try {
      await workshopRatingService.remove(existing.id);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir avaliação');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {existing ? 'Editar Avaliação' : 'Avaliar Oficina'}
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ mt: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {scheduleLabel}
        </Typography>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Sua nota
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
          {[1, 2, 3, 4, 5].map((value) => (
            <IconButton
              key={value}
              onClick={() => setRating(value)}
              size="small"
              color="warning"
              aria-label={`${value} estrela${value > 1 ? 's' : ''}`}
            >
              {rating !== null && rating >= value ? <StarIcon /> : <StarBorderIcon />}
            </IconButton>
          ))}
        </Box>

        <TextField
          label="Comentário (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          multiline
          rows={3}
          fullWidth
          size="small"
          placeholder="Conte como foi sua experiência..."
        />

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {existing && (
          <Button
            onClick={handleDelete}
            color="error"
            disabled={submitting}
            sx={{ mr: 'auto' }}
          >
            Excluir Avaliação
          </Button>
        )}
        <Button onClick={onClose} color="inherit" disabled={submitting}>
          Cancelar
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={submitting}>
          {submitting ? 'Salvando…' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
