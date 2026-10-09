import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AppProvider } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { installGlobalErrorHandlers } from './utils/errorReport';

// Erreurs hors écran (réseau, échec de chargement après mise à jour) : enregistrées dans le journal
installGlobalErrorHandlers();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary scope="app">
    <AppProvider>
      <App />
    </AppProvider>
  </ErrorBoundary>
);
