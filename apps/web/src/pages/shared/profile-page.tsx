import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { PhotoCamera as PhotoCameraIcon } from '@mui/icons-material';
import { api } from '../../services/api';
import { workshopService } from '../../services/workshop-service';
import type { Workshop } from '../../services/workshop-service';
import { useAuth } from '../../context/auth-context';

const API_BASE_URL = 'http://localhost:5500';

const resolveAssetUrl = (url?: string | null) => {
  if (!url) return undefined;
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
};

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: 'CLIENT' | 'WORKSHOP';
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  avatar_url?: string | null;
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const isWorkshop = user?.role === 'WORKSHOP';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workshop, setWorkshop] = useState<Workshop | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const me: UserProfile = await api.users.getProfile();
        setProfile(me);
        if (me.role === 'WORKSHOP') {
          try {
            const ws = await workshopService.getCurrentWorkshop();
            setWorkshop(ws);
          } catch {
            setWorkshop(null);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar o perfil');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleUserField = (field: keyof UserProfile) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile((prev) => (prev ? { ...prev, [field]: e.target.value } : prev));
  };

  const handleWorkshopField = (field: keyof Workshop) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setWorkshop((prev) => (prev ? { ...prev, [field]: e.target.value } : prev));
  };

  const handleSave = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updatedUser = await api.users.updateProfile({
        name: profile.name,
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        state: profile.state,
      });
      updateUser({ name: updatedUser.name, avatar_url: updatedUser.avatar_url });

      if (isWorkshop && workshop) {
        await workshopService.updateCurrentWorkshop({
          name: workshop.name,
          email: workshop.email,
          description: workshop.description,
          phone: workshop.phone,
          address: workshop.address,
          city: workshop.city,
          state: workshop.state,
          opening_hours: workshop.opening_hours,
        });
      }

      setSuccess('Perfil atualizado com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar o perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError(null);
      const updated = await api.users.uploadAvatar(file);
      setProfile((prev) => (prev ? { ...prev, avatar_url: updated.avatar_url } : prev));
      updateUser({ avatar_url: updated.avatar_url });
      setSuccess('Foto de perfil atualizada!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar a foto');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setError(null);
      const updated = await workshopService.uploadLogo(file);
      setWorkshop(updated);
      setSuccess('Logo da oficina atualizada!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar a logo');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={10}>
        <CircularProgress />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ width: '100%' }}>
        <Alert severity="error">{error || 'Perfil não encontrado'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Meu Perfil
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Informações Pessoais
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 3 }}>
          <Avatar
            src={resolveAssetUrl(profile.avatar_url)}
            sx={{ width: 72, height: 72, fontSize: 28 }}
          >
            {profile.name?.charAt(0)}
          </Avatar>
          <Box>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleAvatarUpload}
            />
            <Button
              variant="outlined"
              startIcon={<PhotoCameraIcon />}
              onClick={() => avatarInputRef.current?.click()}
            >
              Alterar foto
            </Button>
          </Box>
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="Nome" fullWidth value={profile.name ?? ''} onChange={handleUserField('name')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Email" fullWidth value={profile.email ?? ''} disabled />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Telefone" fullWidth value={profile.phone ?? ''} onChange={handleUserField('phone')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Endereço" fullWidth value={profile.address ?? ''} onChange={handleUserField('address')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Cidade" fullWidth value={profile.city ?? ''} onChange={handleUserField('city')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Estado" fullWidth value={profile.state ?? ''} onChange={handleUserField('state')} />
          </Grid>
        </Grid>
      </Paper>

      {isWorkshop && workshop && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Dados da Oficina
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 3 }}>
            <Avatar
              variant="rounded"
              src={resolveAssetUrl(workshop.logo_url)}
              sx={{ width: 72, height: 72 }}
            >
              {workshop.name?.charAt(0)}
            </Avatar>
            <Box>
              <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={handleLogoUpload} />
              <Button
                variant="outlined"
                startIcon={<PhotoCameraIcon />}
                onClick={() => logoInputRef.current?.click()}
              >
                Alterar logo
              </Button>
            </Box>
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="Nome da Oficina" fullWidth value={workshop.name ?? ''} onChange={handleWorkshopField('name')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Email da Oficina" fullWidth value={workshop.email ?? ''} onChange={handleWorkshopField('email')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Telefone" fullWidth value={workshop.phone ?? ''} onChange={handleWorkshopField('phone')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Horário de Funcionamento" fullWidth value={workshop.opening_hours ?? ''} onChange={handleWorkshopField('opening_hours')} placeholder="Seg-Sex 8h-18h" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Endereço" fullWidth value={workshop.address ?? ''} onChange={handleWorkshopField('address')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Cidade" fullWidth value={workshop.city ?? ''} onChange={handleWorkshopField('city')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Estado" fullWidth value={workshop.state ?? ''} onChange={handleWorkshopField('state')} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Descrição" fullWidth multiline minRows={2} value={workshop.description ?? ''} onChange={handleWorkshopField('description')} />
            </Grid>
          </Grid>
        </Paper>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </Box>
    </Box>
  );
}
