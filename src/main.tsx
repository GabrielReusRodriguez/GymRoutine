import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { DbProvider } from './client/hooks/useDb';
import { AuthProvider } from './client/hooks/useAuth';
import './styles.css';

const container = document.getElementById('root');
if (!container) throw new Error('Falta el nodo #root');

createRoot(container).render(
  <StrictMode>
    <DbProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </DbProvider>
  </StrictMode>,
);
