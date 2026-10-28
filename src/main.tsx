import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { DbProvider } from './client/hooks/useDb';
import { AuthProvider } from './client/hooks/useAuth';
import { I18nProvider } from './client/i18n';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root node');

createRoot(container).render(
  <StrictMode>
    <DbProvider>
      <AuthProvider>
        <I18nProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </I18nProvider>
      </AuthProvider>
    </DbProvider>
  </StrictMode>,
);
