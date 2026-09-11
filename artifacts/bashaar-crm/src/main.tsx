import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';
import { setBaseUrl } from '@/lib/api-base';

import './index.css';

// In production the frontend and API can end up on different domains (e.g.
// this app hosted on InsForge Sites, the Express API hosted elsewhere).
// When that's the case, set VITE_API_BASE_URL at build time so requests to
// "/api/..." resolve to the right host. Left unset, requests stay relative —
// which is what local dev relies on via the Vite proxy.
if (import.meta.env.VITE_API_BASE_URL) {
  setBaseUrl(import.meta.env.VITE_API_BASE_URL);
}

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
