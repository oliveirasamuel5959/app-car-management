import { AppBar, Box, Toolbar, Typography, Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';

const Navbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleLogoClick = () => {
    if (isAuthenticated) {
      const dashboardPath = user?.role === 'WORKSHOP' 
        ? '/workshop/dashboard' 
        : '/dashboard';
      navigate(dashboardPath);
    } else {
      navigate('/');
    }
  };

  return (
    <AppBar position="fixed">
      <Toolbar>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ flexGrow: 1, cursor: 'pointer', textAlign: 'left' }}
          onClick={handleLogoClick}
        >
          Car Management System
        </Typography>
        <Stack direction="row" spacing={2}>
          {isAuthenticated ? (
            <>
              <Button 
                color="inherit" 
                onClick={() => navigate('/profile')}
              >
                Profile
              </Button>
              <Button 
                color="inherit" 
                variant="outlined" 
                onClick={handleLogout}
                sx={{ borderColor: 'inherit' }}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button 
                color="inherit" 
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
              <Button 
                color="inherit" 
                variant="outlined" 
                onClick={() => navigate('/signup')}
                sx={{ borderColor: 'inherit' }}
              >
                Sign Up
              </Button>
            </>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
