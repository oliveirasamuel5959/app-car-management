import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Refresh as RefreshIcon, Storefront as StorefrontIcon } from "@mui/icons-material";
import { WorkshopCard } from "../../components/workshops/workshop-card";
import type { WorkshopSearchItem } from "../../services/workshop-service";
import { workshopService } from "../../services/workshop-service";

export default function WorkshopPage() {
  const [workshops, setWorkshops] = useState<WorkshopSearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkshops = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await workshopService.listWorkshops();
      setWorkshops(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar oficinas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkshops();
  }, []);

  return (
    <Box sx={{ width: "100%", maxWidth: 960, mx: "auto", px: { xs: 2, md: 0 } }}>
      <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h4" fontWeight={700}>
          Oficinas
        </Typography>
        <Tooltip title="Atualizar">
          <IconButton onClick={fetchWorkshops} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" mt={10}>
          <CircularProgress />
        </Box>
      ) : workshops.length === 0 ? (
        <Card sx={{ textAlign: "center", py: 8 }}>
          <CardContent>
            <StorefrontIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhuma oficina encontrada
            </Typography>
            <Typography variant="body2" color="text.disabled">
              As oficinas cadastradas aparecerão aqui.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {workshops.map((workshop) => (
            <Grid item xs={12} sm={6} md={4} key={workshop.id}>
              <WorkshopCard
                id={workshop.id}
                name={workshop.name}
                description={workshop.description ?? ""}
                latitude={workshop.latitude}
                longitude={workshop.longitude}
                rating_avg={workshop.rating_avg}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
