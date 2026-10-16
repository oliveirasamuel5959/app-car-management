import { createTheme } from '@mui/material/styles';

/**
 * MUI is a second, parallel palette: its colours are static hex and do not read
 * the CSS custom properties in src/index.css, so the two can drift. Until MUI
 * is removed entirely (see specs/2026-10-15-frontend-redesign), every value here
 * is kept equal to its token counterpart in src/index.css by hand — the brand
 * blue in particular, because the two are close enough that a partial swap
 * would put two different blues on the same screen. Note MUI does not follow the
 * `.dark` class, so dark-mode MUI surfaces keep these light-theme values.
 */
const theme = createTheme({
  palette: {
    primary: {
      main: '#0B6BA8',
      light: '#3E9AD1',
      dark: '#08507D',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#06B6D4',
      light: '#22D3EE',
      dark: '#0891B2',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F6F8FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#14202B',
      secondary: '#6B7280',
    },
    divider: '#E1E6EC',
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
    fontFamily: '"Plus Jakarta Sans", "system-ui", "Avenir", "Helvetica", "Arial", sans-serif',
    fontSize: 15,
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
    /* Matches the token layer's default radius (10px). */
    borderRadius: 10,
  },
});

export default theme;