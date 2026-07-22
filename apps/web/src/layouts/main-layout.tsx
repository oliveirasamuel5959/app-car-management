import { Box } from '@mui/material';
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
      {/*
        Full-bleed main: the nested AppLayout owns the single fixed-header
        offset and all content padding, so this wrapper adds no extra margins.
      */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
      >
        {children}
      </Box>
      {/* <Footer /> */}
    </Box>
  );
};

export default MainLayout;