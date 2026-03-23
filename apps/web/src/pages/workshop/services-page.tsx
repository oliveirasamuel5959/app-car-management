import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  Grid,
  TextField,
  Button,
  Alert,
  CircularProgress,
  MenuItem,
  Stack,
  FormGroup,
  FormControlLabel,
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';

import {
  Add as AddIcon,
  Build as BuildIcon,
  FlashOn as ElectricIcon,
} from '@mui/icons-material';

import { serviceService } from '../../services/service-service';
import { workshopClientService } from '../../services/workshop-client-service';
import type { WorkshopClient } from '../../services/workshop-client-service';

interface FormData {
  workshop_client_id: number | '';
  description: string;
  checkin_date: string;
  checkin_time: string;
  estimated_finish_date: string;
  estimated_finish_time: string;
  planned_maintenance_hours: number | '';
  planned_maintenance_minutes: number | '';
  service_types: string[];
  inspecao: boolean;
  troca_periodica: boolean;
  substituicao: boolean;
}

const initialFormData: FormData = {
  workshop_client_id: '',
  description: '',
  checkin_date: '',
  checkin_time: '',
  estimated_finish_date: '',
  estimated_finish_time: '',
  planned_maintenance_hours: '',
  planned_maintenance_minutes: '',
  service_types: [],
  inspecao: false,
  troca_periodica: false,
  substituicao: false,
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="outlined">
      <Box sx={{ px: 3, py: 1.5, bgcolor: 'action.hover' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {title}
        </Typography>
      </Box>
      <Divider />
      <CardContent sx={{ pt: 2.5 }}>{children}</CardContent>
    </Card>
  );
}

export default function WorkshopServicesPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [clients, setClients] = useState<WorkshopClient[]>([]);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const data = await workshopClientService.getClients();
        setClients(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load clients:', err);
      }
    };
    fetchClients();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (
      name === 'planned_maintenance_hours' ||
      name === 'planned_maintenance_minutes' ||
      name === 'workshop_client_id'
    ) {
      setFormData((prev) => ({ ...prev, [name]: value === '' ? '' : Number(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleServiceTypeChange = (_: React.MouseEvent<HTMLElement>, newTypes: string[]) => {
    setFormData((prev) => ({ ...prev, service_types: newTypes }));
  };

  const handleChecklistChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const validateForm = () => {
    if (!formData.workshop_client_id) {
      setError('Selecione um cliente');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Descrição da tarefa é obrigatória');
      return false;
    }
    if (!formData.checkin_date) {
      setError('Data inicial é obrigatória');
      return false;
    }
    if (
      typeof formData.planned_maintenance_minutes === 'number' &&
      (formData.planned_maintenance_minutes < 0 || formData.planned_maintenance_minutes > 59)
    ) {
      setError('Minutos deve ser entre 0 e 59');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      const checkinDatetime = formData.checkin_time
        ? `${formData.checkin_date}T${formData.checkin_time}`
        : formData.checkin_date;

      const finishDatetime = formData.estimated_finish_date
        ? formData.estimated_finish_time
          ? `${formData.estimated_finish_date}T${formData.estimated_finish_time}`
          : formData.estimated_finish_date
        : undefined;

      const plannedHours = formData.planned_maintenance_hours === '' ? 0 : Number(formData.planned_maintenance_hours);
      const plannedMinutes = formData.planned_maintenance_minutes === '' ? 0 : Number(formData.planned_maintenance_minutes);
      const estimatedHours =
        formData.planned_maintenance_hours === '' && formData.planned_maintenance_minutes === ''
          ? undefined
          : Number((plannedHours + plannedMinutes / 60).toFixed(2));

      const checklistNotes = [
        formData.inspecao ? 'Inspeção' : '',
        formData.troca_periodica ? 'Troca periódica' : '',
        formData.substituicao ? 'Substituição' : '',
      ]
        .filter(Boolean)
        .join(', ');

      const noteParts = [
        formData.service_types.length > 0 ? `Tipo: ${formData.service_types.join(', ')}` : '',
        checklistNotes ? `Lista: ${checklistNotes}` : '',
      ].filter(Boolean);

      await serviceService.createService({
        workshop_client_id: formData.workshop_client_id as number,
        name: formData.description.slice(0, 100),
        description: formData.description || undefined,
        status: 'pending',
        progress_percentage: 0,
        checkin_date: checkinDatetime,
        estimated_finish_date: finishDatetime,
        estimated_hours: estimatedHours,
        workshop_notes: noteParts.length > 0 ? noteParts.join(' | ') : undefined,
      });

      setSuccess('Tarefa de manutenção criada com sucesso!');
      setFormData(initialFormData);

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create service');
      console.error('Error creating service:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight={700}>
          Tarefa de Manutenção
        </Typography>
        {loading && <CircularProgress size={24} />}
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stack spacing={3}>

        {/* Section 1: Tarefa */}
        <SectionCard title="Tarefa">
          <Stack spacing={2}>
            <TextField
              label="Selecionar cliente"
              select
              fullWidth
              required
              value={formData.workshop_client_id}
              onChange={handleInputChange}
              name="workshop_client_id"
            >
              {clients.length === 0 && (
                <MenuItem value="" disabled>
                  Nenhum cliente encontrado. Adicione clientes primeiro.
                </MenuItem>
              )}
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name} — {client.vehicle_brand} {client.vehicle_model} ({client.vehicle_plate})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Descrição da tarefa"
              fullWidth
              required
              multiline
              rows={3}
              value={formData.description}
              onChange={handleInputChange}
              name="description"
              placeholder="Descreva a tarefa de manutenção..."
            />
          </Stack>
        </SectionCard>

        {/* Section 2: Planejamento */}
        <SectionCard title="Planejamento">
          <Stack spacing={3}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                Data inicial
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={7}>
                  <TextField
                    label="Data"
                    type="date"
                    fullWidth
                    required
                    value={formData.checkin_date}
                    onChange={handleInputChange}
                    name="checkin_date"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <TextField
                    label="Hora"
                    type="time"
                    fullWidth
                    value={formData.checkin_time}
                    onChange={handleInputChange}
                    name="checkin_time"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                Data final
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={7}>
                  <TextField
                    label="Data"
                    type="date"
                    fullWidth
                    value={formData.estimated_finish_date}
                    onChange={handleInputChange}
                    name="estimated_finish_date"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <TextField
                    label="Hora"
                    type="time"
                    fullWidth
                    value={formData.estimated_finish_time}
                    onChange={handleInputChange}
                    name="estimated_finish_time"
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                Tempo de manutenção planejado
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Horas"
                    type="number"
                    fullWidth
                    value={formData.planned_maintenance_hours}
                    onChange={handleInputChange}
                    name="planned_maintenance_hours"
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Minutos"
                    type="number"
                    fullWidth
                    value={formData.planned_maintenance_minutes}
                    onChange={handleInputChange}
                    name="planned_maintenance_minutes"
                    inputProps={{ min: 0, max: 59 }}
                  />
                </Grid>
              </Grid>
            </Box>
          </Stack>
        </SectionCard>

        {/* Section 3: Tipo de serviço */}
        <SectionCard title="Tipo de serviço">
          <ToggleButtonGroup
            value={formData.service_types}
            onChange={handleServiceTypeChange}
            aria-label="tipo de serviço"
            sx={{ gap: 1, flexWrap: 'wrap' }}
          >
            <ToggleButton
              value="mecanico"
              aria-label="Mecânico"
              sx={{ px: 3, py: 1.5, gap: 1, borderRadius: 2 }}
            >
              <BuildIcon fontSize="small" />
              <Typography variant="body2" fontWeight={500}>
                Mecânico
              </Typography>
            </ToggleButton>

            <ToggleButton
              value="eletrico"
              aria-label="Elétrico"
              sx={{ px: 3, py: 1.5, gap: 1, borderRadius: 2 }}
            >
              <ElectricIcon fontSize="small" />
              <Typography variant="body2" fontWeight={500}>
                Elétrico
              </Typography>
            </ToggleButton>
          </ToggleButtonGroup>
        </SectionCard>

        {/* Section 4: Lista de verificação */}
        <SectionCard title="Lista de verificação">
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.inspecao}
                  onChange={handleChecklistChange}
                  name="inspecao"
                />
              }
              label="Inspeção"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.troca_periodica}
                  onChange={handleChecklistChange}
                  name="troca_periodica"
                />
              }
              label="Troca periódica"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.substituicao}
                  onChange={handleChecklistChange}
                  name="substituicao"
                />
              }
              label="Substituição"
            />
          </FormGroup>
        </SectionCard>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pb: 4 }}>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            size="large"
            startIcon={<AddIcon />}
            disabled={loading}
            sx={{ px: 4 }}
          >
            {loading ? 'Criando...' : 'Criar Tarefa'}
          </Button>
        </Box>

      </Stack>
    </Box>
  );
}
