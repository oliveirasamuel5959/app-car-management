import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
} from '@mui/material';

import {
  DirectionsCar as CarIcon,
  Assignment as OrdersIcon,
  CheckCircle as CompleteIcon,
  Schedule as PendingIcon,
  BuildCircle as InProgressIcon,
} from '@mui/icons-material';

import { useAuth } from '../../context/auth-context';
import { serviceService } from '../../services/service-service';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  averageServiceTime: number;
}

function StatCard({
  title,
  value,
  icon,
  color = 'primary',
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}) {
  const colorMap = {
    primary: 'primary.main',
    success: 'success.main',
    warning: 'warning.main',
    error: 'error.main',
    info: 'info.main',
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="overline">
              {title}
            </Typography>
            <Typography variant="h5">{value}</Typography>
          </Box>
          <Box sx={{ color: colorMap[color], fontSize: 40 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function WorkshopDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    completedOrders: 0,
    averageServiceTime: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch services - in the future this might filter by current workshop ID
        const services = await serviceService.getServices();
        
        if (services && Array.isArray(services)) {
          const pendingCount = services.filter((s) => s.status === 'pending').length;
          const inProgressCount = services.filter((s) => s.status === 'in_progress').length;
          const completedCount = services.filter((s) => s.status === 'completed').length;

          setStats({
            totalOrders: services.length,
            pendingOrders: pendingCount,
            inProgressOrders: inProgressCount,
            completedOrders: completedCount,
            averageServiceTime: 5, // placeholder
          });
        }
      } catch (err) {
        console.error('Error fetching workshop data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Workshop Dashboard
        </Typography>
        {user?.name && (
          <Typography variant="body1" color="textSecondary">
            Welcome back, {user.name}
          </Typography>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={<OrdersIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending"
            value={stats.pendingOrders}
            icon={<PendingIcon />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="In Progress"
            value={stats.inProgressOrders}
            icon={<InProgressIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completed"
            value={stats.completedOrders}
            icon={<CompleteIcon />}
            color="success"
          />
        </Grid>
      </Grid>

      {/* Quick Stats */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Service Performance" />
            <Divider />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Completion Rate
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ flexGrow: 1, mr: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={
                        stats.totalOrders > 0
                          ? (stats.completedOrders / stats.totalOrders) * 100
                          : 0
                      }
                    />
                  </Box>
                  <Typography variant="body2">
                    {stats.totalOrders > 0
                      ? Math.round((stats.completedOrders / stats.totalOrders) * 100)
                      : 0}
                    %
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Average Service Time
                </Typography>
                <Chip
                  label={`${stats.averageServiceTime} days`}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Quick Actions" />
            <Divider />
            <CardContent>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip
                  label="View All Orders"
                  onClick={() => window.location.href = '/workshop/orders'}
                  color="primary"
                />
                <Chip
                  label="Create Service"
                  onClick={() => window.location.href = '/workshop/services/new'}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label="View Services"
                  onClick={() => window.location.href = '/workshop/services'}
                  color="secondary"
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
