import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import './locales/i18n'; // Initialize i18n
createRoot(document.getElementById('root')!).render(
  <BrowserRouter future={{ v7_startTransition: true }}>
    <HelmetProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </HelmetProvider>
  </BrowserRouter>
);
