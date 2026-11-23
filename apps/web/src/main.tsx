import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@marca/tokens.css';
import './styles/app.css';
import { App } from './App.tsx';
import { applyStoredTheme, ToastProvider } from './lib/context.tsx';

applyStoredTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
