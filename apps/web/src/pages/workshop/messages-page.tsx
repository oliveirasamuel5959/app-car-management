import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Avatar,
} from '@mui/material';
import { Chat as ChatIcon, Person as PersonIcon } from '@mui/icons-material';
import { workshopClientService, type WorkshopClient } from '../../services/workshop-client-service';

export default function WorkshopMessagesPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<WorkshopClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    workshopClientService
      .getClients()
      .then((data) => {
        // Only show clients who are registered system users (have user_id)
        setClients(data.filter((c) => c.user_id != null));
      })
      .catch((err: any) => setError(err.message || 'Erro ao carregar clientes'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box className="flex items-center justify-center min-h-[60vh]">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="flex items-center justify-center min-h-[60vh]">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box className="p-6 max-w-2xl mx-auto">
      <Typography variant="h5" fontWeight={600} className="mb-6">
        Mensagens
      </Typography>

      {clients.length === 0 ? (
        <Box className="flex flex-col items-center justify-center py-16 text-center">
          <ChatIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Nenhuma conversa disponível
          </Typography>
          <Typography variant="body2" color="text.disabled" className="mt-1">
            Clientes com conta no sistema aparecerão aqui.
          </Typography>
        </Box>
      ) : (
        <Box className="flex flex-col gap-3">
          {clients.map((client) => (
            <Card key={client.id} elevation={1} sx={{ borderRadius: 2 }}>
              <CardActionArea
                onClick={() =>
                  navigate(`/workshop/messages/chat/${client.user_id}`, {
                    state: { clientName: client.name },
                  })
                }
              >
                <CardContent className="flex items-center gap-4">
                  <Avatar sx={{ bgcolor: 'secondary.main', width: 48, height: 48 }}>
                    <PersonIcon />
                  </Avatar>
                  <Box className="flex-1 min-w-0">
                    <Typography variant="subtitle1" fontWeight={600} noWrap>
                      {client.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {client.vehicle_brand} {client.vehicle_model} — {client.vehicle_plate}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}
