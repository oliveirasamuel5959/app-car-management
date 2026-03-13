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
  Notifications as NotificationsIcon
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
    // {
    //   text: 'Orders',
    //   icon: <OrdersIcon />,
    //   path: '/workshop/orders',
    //   badge: pendingOrders > 0 ? pendingOrders : undefined
    // },
    {
      text: 'Clients',
      icon: <PeopleIcon />,
      path: '/workshop/clients',
    },
    { text: 'Services', icon: <ServicesIcon />, path: '/workshop/services' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/workshop/settings' },
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
        bgcolor: '#0F172A',
        color: '#F1F5F9',
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
              color: '#FFFFFF',
            }}
          >
            CarKeep Workshop
          </Typography>
        )}
        <IconButton
          onClick={onToggleCollapse}
          sx={{
            borderRadius: 2,
            color: '#94A3B8',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.08)',
              color: '#FFFFFF',
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />

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
                color: '#94A3B8',
                '&.Mui-selected': {
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  '&:hover': {
                    backgroundColor: '#1D4ED8',
                  },
                  '& .MuiListItemIcon-root': {
                    color: '#FFFFFF',
                  },
                },
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  color: '#FFFFFF',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: collapsed ? 0 : 40,
                  justifyContent: 'center',
                  color: isSelected ? '#FFFFFF' : '#94A3B8',
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
                    fontSize: '0.9rem',
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
