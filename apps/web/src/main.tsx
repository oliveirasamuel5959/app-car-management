import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme';
import { ThemeProvider as CustomThemeProvider } from './context/theme-context';
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <CustomThemeProvider>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </CustomThemeProvider>
);