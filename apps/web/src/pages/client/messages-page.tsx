import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  CircularProgress,
  Avatar,
} from '@mui/material';
import { Chat as ChatIcon, Build as BuildIcon } from '@mui/icons-material';
import { serviceService } from '../../services/service-service';
import { workshopService } from '../../services/workshop-service';

interface WorkshopConversation {
  workshopId: number;
  workshopName: string;
  workshopUserId: number;
  activeServices: number;
  latestServiceStatus: string;
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<WorkshopConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const services = await serviceService.getMyServices();

      // Group services by workshop_id
      const workshopMap = new Map<number, any[]>();
      for (const service of services) {
        if (!workshopMap.has(service.workshop_id)) {
          workshopMap.set(service.workshop_id, []);
        }
        workshopMap.get(service.workshop_id)!.push(service);
      }

      // Fetch workshop details for each unique workshop_id
      const conversationList: WorkshopConversation[] = [];
      for (const [workshopId, workshopServices] of workshopMap.entries()) {
        try {
          const workshop = await workshopService.getWorkshopById(workshopId);
          conversationList.push({
            workshopId,
            workshopName: workshop.name || `Oficina #${workshopId}`,
            workshopUserId: workshop.user_id,
            activeServices: workshopServices.length,
            latestServiceStatus: workshopServices[0]?.status ?? 'unknown',
          });
        } catch {
          // Skip workshops that can't be fetched
        }
      }

      setConversations(conversationList);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar conversas');
    } finally {
      setLoading(false);
    }
  };

  const statusLabel: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
    pending: { label: 'Pendente', color: 'warning' },
    in_progress: { label: 'Em Andamento', color: 'primary' },
    completed: { label: 'Concluído', color: 'success' },
    cancelled: { label: 'Cancelado', color: 'error' },
  };

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

      {conversations.length === 0 ? (
        <Box className="flex flex-col items-center justify-center py-16 text-center">
          <ChatIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Nenhuma conversa disponível
          </Typography>
          <Typography variant="body2" color="text.disabled" className="mt-1">
            As oficinas com serviços ativos aparecerão aqui.
          </Typography>
        </Box>
      ) : (
        <Box className="flex flex-col gap-3">
          {conversations.map((conv) => {
            const status = statusLabel[conv.latestServiceStatus] ?? { label: conv.latestServiceStatus, color: 'default' as const };
            return (
              <Card key={conv.workshopId} elevation={1} sx={{ borderRadius: 2 }}>
                <CardActionArea
                  onClick={() =>
                    navigate(`/client/messages/chat/${conv.workshopUserId}`, {
                      state: { workshopName: conv.workshopName },
                    })
                  }
                >
                  <CardContent className="flex items-center gap-4">
                    <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                      <BuildIcon />
                    </Avatar>
                    <Box className="flex-1 min-w-0">
                      <Typography variant="subtitle1" fontWeight={600} noWrap>
                        {conv.workshopName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {conv.activeServices} serviço{conv.activeServices !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                    <Chip
                      label={status.label}
                      color={status.color}
                      size="small"
                    />
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
