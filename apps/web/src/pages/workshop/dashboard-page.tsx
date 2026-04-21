import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { useAuth } from '../../context/auth-context';
import { serviceService } from '../../services/service-service';

interface ServiceItem {
  id: number;
  workshop_client_id?: number | null;
  name: string;
  status: string;
  checkin_date: string;
  estimated_finish_date?: string | null;
  workshop_notes?: string | null;
  created_at?: string | null;
}

function formatDate(dateString?: string | null) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function StatCard({ title, value, loading }: { title: string; value: number; loading: boolean }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Typography variant="h4" fontWeight={700} sx={{ color: 'primary.main' }}>
            {value}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function WorkshopDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [recentActivities, setRecentActivities] = useState<ServiceItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const servicesData = await serviceService.getServices();

        if (servicesData && Array.isArray(servicesData)) {
          const allServices = servicesData as ServiceItem[];
          setServices(allServices);

          // Calculate total orders
          setTotalOrders(allServices.length);

          // Calculate pending orders
          const pending = allServices.filter((s) => s.status === 'pending').length;
          setPendingOrders(pending);

          // Get recent activities (last 5 created orders, sorted by created_at)
          const recent = [...allServices]
            .sort((a, b) => {
              const aDate = new Date(a.created_at || a.checkin_date || '').getTime();
              const bDate = new Date(b.created_at || b.checkin_date || '').getTime();
              return bDate - aDate;
            })
            .slice(0, 5);

          setRecentActivities(recent);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          {user?.name || 'Oficina'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Total de Ordens de Serviço" value={totalOrders} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard title="Ordens Pendentes" value={pendingOrders} loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Ordens em Progresso"
            value={services.filter((s) => s.status === 'in_progress').length}
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Recent Activities */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
            Atividades Recentes
          </Typography>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : recentActivities.length === 0 ? (
            <Typography color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
              Nenhuma atividade recente
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? '#212121' : '#F3F4F6' }}>
                    <TableCell sx={{ fontWeight: 600 }}>Serviço</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Data/Hora</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentActivities.map((activity) => (
                    <TableRow key={activity.id} hover>
                      <TableCell>{activity.name}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={(theme) => ({
                            display: 'inline-block',
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            backgroundColor:
                              activity.status === 'pending'
                                ? theme.palette.mode === 'dark' ? '#3d3d3d' : '#ffeaa7'
                                : activity.status === 'in_progress'
                                  ? theme.palette.mode === 'dark' ? '#2c3e50' : '#a8dadc'
                                  : activity.status === 'completed'
                                    ? theme.palette.mode === 'dark' ? '#2d5016' : '#c7e9c0'
                                    : theme.palette.mode === 'dark' ? '#3d2d2d' : '#f8d7da',
                            color:
                              activity.status === 'pending'
                                ? theme.palette.mode === 'dark' ? '#ffd700' : '#856404'
                                : activity.status === 'in_progress'
                                  ? theme.palette.mode === 'dark' ? '#5dade2' : '#084298'
                                  : activity.status === 'completed'
                                    ? theme.palette.mode === 'dark' ? '#82e0aa' : '#0f5132'
                                    : theme.palette.mode === 'dark' ? '#f8b4b4' : '#842029',
                          })}
                        >
                          {activity.status === 'pending'
                            ? 'Pendente'
                            : activity.status === 'in_progress'
                              ? 'Em Progresso'
                              : activity.status === 'completed'
                                ? 'Concluído'
                                : activity.status}
                        </Typography>
                      </TableCell>
                      <TableCell>{formatDate(activity.created_at || activity.checkin_date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
