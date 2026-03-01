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
const NAVBAR_HEIGHT = 64;

interface AppLayoutProps {
  children: React.ReactNode;
  pendingOrders?: number;
}

export const AppLayout = ({ children, pendingOrders = 0 }: AppLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  // Determine which sidebar to show based on user role
  const isWorkshop = user?.role === 'WORKSHOP';

  const drawerContent = isWorkshop ? (
    <WorkshopSidebar 
      onMobileClose={handleDrawerToggle} 
      isMobile={isMobile}
      pendingOrders={pendingOrders}
    />
  ) : (
    <ClientSidebar 
      onMobileClose={handleDrawerToggle} 
      isMobile={isMobile}
    />
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Box
        component="nav"
        sx={{
          width: { sm: DRAWER_WIDTH },
          flexShrink: { sm: 0 },
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
              height: `calc(100vh - ${NAVBAR_HEIGHT}px)`
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
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              top: `${NAVBAR_HEIGHT}px`,
              height: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
              borderRight: '1px solid rgba(0,0,0,0.12)',
              overflowY: 'auto'
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
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        {/* Navbar */}
        {/* <Navbar> */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
        {/* </Navbar> */}

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            mt: `${NAVBAR_HEIGHT}px`
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
