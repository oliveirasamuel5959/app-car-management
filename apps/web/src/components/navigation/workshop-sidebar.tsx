import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  IconButton,
  Badge,
  Tooltip
} from '@mui/material';

import {
  Dashboard as DashboardIcon,
  Assignment as OrdersIcon,
  People as PeopleIcon,
  BuildCircle as ServicesIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Chat as ChatIcon,
  History as HistoryIcon,
  EventNote as ScheduleIcon,
  Star as StarIcon,
  Handyman as HandymanIcon,
} from '@mui/icons-material';

import { useNavigate, useLocation } from 'react-router-dom';

interface WorkshopSidebarProps {
  onMobileClose?: () => void;
  isMobile?: boolean;
  pendingOrders?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const WorkshopSidebar = ({
  onMobileClose,
  isMobile = false,
  pendingOrders = 0,
  collapsed = false,
  onToggleCollapse
}: WorkshopSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/workshop/dashboard' },
    { text: 'Clientes Oficina', icon: <PeopleIcon />, path: '/workshop/clients' },
    { text: 'Agendamentos', icon: <ScheduleIcon />, path: '/workshop/schedules' },
    { text: 'Avaliações', icon: <StarIcon />, path: '/workshop/ratings' },
    { text: 'Serviços Oferecidos', icon: <HandymanIcon />, path: '/workshop/services-offered' },
    { text: 'Ordens de Serviço', icon: <ServicesIcon />, path: '/workshop/services' },
    { text: 'Histórico de Manutenção', icon: <HistoryIcon />, path: '/workshop/service-history' },
    { text: 'Criar Orçamento', icon: <ServicesIcon />, path: '/workshop/orders/new' },
    { text: 'Mensagens', icon: <ChatIcon />, path: '/workshop/messages' },
    { text: 'Configurações', icon: <SettingsIcon />, path: '/workshop/settings' },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        color: 'text.primary',
        fontSize: '13px'
      }}
    >
      {/* Header with hamburger toggle */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          p: collapsed ? 1 : 2,
          minHeight: 56,
        }}
      >
        {!collapsed && (
          <Typography
            variant="h6"
            noWrap
            sx={{
              fontWeight: 700,
              fontSize: '1.1rem',
              color: 'primary.main',
            }}
          >
            DrivePluss
          </Typography>
        )}
        <IconButton
          onClick={onToggleCollapse}
          sx={{
            borderRadius: 2,
            color: 'text.secondary',
            '&:hover': {
              backgroundColor: 'action.hover',
              color: 'primary.main',
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      </Box>

      <Divider />

      {/* Navigation items */}
      <List sx={{ px: collapsed ? 0.5 : 1, py: 1, flexGrow: 1 }}>
        {menuItems.map((item) => {
          const isSelected = location.pathname === item.path;
          const button = (
            <ListItemButton
              key={item.text}
              onClick={() => handleNavigate(item.path)}
              selected={isSelected}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                minHeight: 48,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: collapsed ? 1.5 : 2,
                transition: 'all 0.2s ease',
                color: 'text.secondary',
                '&.Mui-selected': {
                  backgroundColor: 'action.selected',
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'action.selected',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'primary.main',
                  },
                },
                '&:hover': {
                  backgroundColor: 'action.hover',
                  color: 'primary.main',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 0 : 40,
                  justifyContent: 'center',
                  color: isSelected ? 'primary.main' : 'text.secondary',
                  transition: 'all 0.2s ease',
                }}
              >
                {item.badge ? (
                  <Badge badgeContent={item.badge} color="error">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              {!collapsed && (
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                />
              )}
            </ListItemButton>
          );

          return collapsed ? (
            <Tooltip key={item.text} title={item.text} placement="right" arrow>
              {button}
            </Tooltip>
          ) : (
            button
          );
        })}
      </List>
    </Box>
  );
};
