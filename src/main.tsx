import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AppRoutes } from './AppRoutes.tsx';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { ThemeProvider } from './components/ThemeProvider';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('GuardAI root element is missing.');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <ThemeProvider defaultTheme="dark" storageKey="guardai-ui-theme">
        <AppRoutes />
      </ThemeProvider>
    </AppErrorBoundary>
  </StrictMode>,
);
