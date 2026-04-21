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
    { text: 'Ordens de Serviço', icon: <ServicesIcon />, path: '/workshop/services' },
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
              color: '#0E71AE',
            }}
          >
            DrivePluss
          </Typography>
        )}
        <IconButton
          onClick={onToggleCollapse}
          sx={{
            borderRadius: 2,
            color: '#64748B',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.05)',
              color: '#0E71AE',
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: 'rgba(0,0,0,0.08)' }} />

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
                color: '#475569',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(14,113,174,0.12)',
                  color: '#0E71AE',
                  '&:hover': {
                    backgroundColor: 'rgba(14,113,174,0.18)',
                  },
                  '& .MuiListItemIcon-root': {
                    color: '#0E71AE',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.04)',
                  color: '#0E71AE',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 0 : 40,
                  justifyContent: 'center',
                  color: isSelected ? '#0E71AE' : '#475569',
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
                  sx={{ padding: '0 0 0 28px' }}
                  primaryTypographyProps={{
                    fontSize: '13px',
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
