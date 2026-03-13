import { useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import Navbar from '../components/navigation/navbar';
import { ClientSidebar } from '../components/navigation/client-sidebar';
import { WorkshopSidebar } from '../components/navigation/workshop-sidebar';

const DRAWER_WIDTH = 240;
const COLLAPSED_WIDTH = 64;
const NAVBAR_HEIGHT = 64;

interface AppLayoutProps {
  children: React.ReactNode;
  pendingOrders?: number;
}

export const AppLayout = ({ children, pendingOrders = 0 }: AppLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleCollapseToggle = () => {
    if (isMobile) {
      handleDrawerToggle();
    } else {
      setCollapsed((prev) => !prev);
    }
  };

  const currentWidth = collapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

  // Determine which sidebar to show based on user role
  const isWorkshop = user?.role === 'WORKSHOP';

  const drawerContent = isWorkshop ? (
    <WorkshopSidebar 
      onMobileClose={handleDrawerToggle} 
      isMobile={isMobile}
      pendingOrders={pendingOrders}
      collapsed={isMobile ? false : collapsed}
      onToggleCollapse={handleCollapseToggle}
    />
  ) : (
    <ClientSidebar 
      onMobileClose={handleDrawerToggle} 
      isMobile={isMobile}
      collapsed={isMobile ? false : collapsed}
      onToggleCollapse={handleCollapseToggle}
    />
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: { sm: currentWidth },
          flexShrink: { sm: 0 },
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              top: `${NAVBAR_HEIGHT}px`,
              height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
              bgcolor: '#0F172A',
              borderRight: 'none',
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              width: currentWidth,
              boxSizing: 'border-box',
              top: `${NAVBAR_HEIGHT}px`,
              height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
              bgcolor: '#0F172A',
              borderRight: 'none',
              overflowX: 'hidden',
              overflowY: 'auto',
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Right Side (Navbar + Content) */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          width: { sm: `calc(100% - ${currentWidth}px)` },
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {/* Mobile hamburger button */}
        <Box sx={{ display: { xs: 'flex', sm: 'none' }, p: 1 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3 },
            mt: `${NAVBAR_HEIGHT}px`,
            width: '100%',
            minWidth: 0,
            overflow: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
