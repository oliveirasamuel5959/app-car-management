import { createTheme } from '@mui/material/styles';

/**
 * MUI is a second, parallel palette: its colours are static hex and do not read
 * the CSS custom properties in src/index.css, so the two can drift. Keep the
 * brand blue here matching `--primary` in the light theme there (#0E71AE =
 * hsl(203 85% 37%)). Note MUI does not follow the `.dark` class, so dark-mode
 * MUI surfaces keep these light-theme values by design.
 */
const theme = createTheme({
  palette: {
    primary: {
      main: '#0E71AE',
      light: '#3E9AD1',
      dark: '#0A5583',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#06B6D4',
      light: '#22D3EE',
      dark: '#0891B2',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#111827',
      secondary: '#6B7280',
    },
    divider: '#E5E7EB',
    success: {
      main: '#22C55E',
      light: '#86EFAC',
      dark: '#16A34A',
    },
    warning: {
      main: '#F59E0B',
      light: '#FCD34D',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444',
      light: '#FCA5A5',
      dark: '#DC2626',
    },
    info: {
      main: '#0EA5E9',
      light: '#7DD3FC',
      dark: '#0284C7',
    },
  },
  typography: {
    fontFamily: '"Inter", "system-ui", "Avenir", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
});

export default theme;