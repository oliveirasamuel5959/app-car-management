import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Build as BuildIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  SERVICE_TYPE_LABELS,
  workshopService,
} from '../../services/workshop-service';

const ALL_SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABELS);

export default function WorkshopServicesOfferedPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await workshopService.getMyWorkshopServices();
      const rows = Array.isArray(data) ? data : [];
      setSelected(rows.map((row) => row.service_type));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Erro ao carregar serviços oferecidos',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const toggleType = (type: string) => {
    setSelected((current) =>
      current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type],
    );
  };

  const saveServices = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      await workshopService.updateMyWorkshopServices(selected);
      setSuccess('Serviços oferecidos atualizados com sucesso.');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Erro ao salvar serviços oferecidos',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 960, mx: 'auto', px: { xs: 2, md: 0 } }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight={700}>
          Serviços Oferecidos
        </Typography>
        <Tooltip title="Atualizar">
          <IconButton onClick={fetchServices} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" mt={10}>
          <CircularProgress />
        </Box>
      ) : (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BuildIcon color="primary" />
              <Typography variant="h6">
                Quais serviços sua oficina oferece?
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Os tipos selecionados aparecem na busca de oficinas dos clientes,
              permitindo que eles filtrem por serviço.
            </Typography>
            <FormGroup>
              {ALL_SERVICE_TYPES.map((type) => (
                <FormControlLabel
                  key={type}
                  control={
                    <Checkbox
                      checked={selected.includes(type)}
                      onChange={() => toggleType(type)}
                    />
                  }
                  label={SERVICE_TYPE_LABELS[type]}
                />
              ))}
            </FormGroup>
            <Button
              variant="contained"
              sx={{ mt: 3 }}
              onClick={saveServices}
              disabled={saving}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
