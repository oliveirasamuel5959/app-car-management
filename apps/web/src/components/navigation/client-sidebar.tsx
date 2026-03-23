import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  IconButton,
  Tooltip
} from '@mui/material';

import {
  Dashboard as DashboardIcon,
  DirectionsCar as CarIcon,
  BuildCircle as WorkshopIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon
} from '@mui/icons-material';

import { useNavigate, useLocation } from 'react-router-dom';

interface ClientSidebarProps {
  onMobileClose?: () => void;
  isMobile?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ClientSidebar = ({
  onMobileClose,
  isMobile = false,
  collapsed = false,
  onToggleCollapse
}: ClientSidebarProps) => {
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
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#FFFFFF',
        color: '#1E293B',
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
                  color: isSelected ? '#0E71AE' : '#64748B',
                  transition: 'all 0.2s ease',
                }}
              >
                {item.icon}
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
