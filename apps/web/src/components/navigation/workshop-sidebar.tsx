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
  Chip
} from '@mui/material';

import {
  Dashboard as DashboardIcon,
  Assignment as OrdersIcon,
  People as PeopleIcon,
  BuildCircle as ServicesIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';

import { useNavigate, useLocation } from 'react-router-dom';

interface WorkshopSidebarProps {
  onMobileClose?: () => void;
  isMobile?: boolean;
  pendingOrders?: number;
}

export const WorkshopSidebar = ({
  onMobileClose,
  isMobile = false,
  pendingOrders = 0
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
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2
        }}
      >
        <Typography variant="h6">CarKeep Workshop</Typography>

        {isMobile && onMobileClose && (
          <IconButton onClick={onMobileClose}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>

      <Divider />

      <List>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.text}
            onClick={() => handleNavigate(item.path)}
            selected={location.pathname === item.path}
            sx={{
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
                '&:hover': {
                  backgroundColor: 'primary.light',
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                color:
                  location.pathname === item.path
                    ? 'primary.main'
                    : 'inherit',
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
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};
