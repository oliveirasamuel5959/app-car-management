import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  IconButton
} from '@mui/material';

import {
  Dashboard as DashboardIcon,
  DirectionsCar as CarIcon,
  BuildCircle as WorkshopIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon
} from '@mui/icons-material';

import { useNavigate, useLocation } from 'react-router-dom';

interface ClientSidebarProps {
  onMobileClose?: () => void;
  isMobile?: boolean;
}

export const ClientSidebar = ({ onMobileClose, isMobile = false }: ClientSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/client/dashboard' },
    { text: 'My Car', icon: <CarIcon />, path: '/client/my-car' },
    { text: 'Find Workshops', icon: <WorkshopIcon />, path: '/client/search-workshops' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/client/settings' },
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
        <Typography variant="h6">CarKeep</Typography>

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
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};
