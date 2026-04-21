import { Box } from '@mui/material';
import Navbar from '../components/navigation/navbar';
import Footer from '../components/navigation/footer';
import Header from '../components/navigation/header';

const MainLayout = ({ children }) => {
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      width: '100%',
      position: 'relative'
    }}>
      <Header />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          py: 3,
          px: { xs: 2, sm: 3, md: 4 },
          mt: 8,
          mb: 10
        }}
      >
        {children}
      </Box>
      <Footer />
    </Box>
  );
};

export default MainLayout;