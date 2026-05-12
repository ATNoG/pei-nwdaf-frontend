import React from 'react';
import ReactDOM from 'react-dom/client';
import Keycloak from 'keycloak-js';
import App from './App.jsx';
import { setKeycloak } from './lib/authFetch.js';
import './index.css';

const keycloakUrl = `http://${import.meta.env.VITE_KEYCLOAK_HOST || 'localhost'}:${import.meta.env.VITE_KEYCLOAK_PORT || '9000'}`;

const kc = new Keycloak({
  url: keycloakUrl,
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'aion',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'aion-frontend',
});

kc.init({ onLoad: 'login-required', checkLoginIframe: false })
  .then((authenticated) => {
    if (authenticated) {
      setKeycloak(kc);
      // Silently refresh the token every 30s so it never expires mid-session
      setInterval(() => kc.updateToken(30).catch(() => kc.logout()), 30000);

      ReactDOM.createRoot(document.getElementById('root')).render(
        <App keycloak={kc} />
      );
    }
  })
  .catch(() => {
    // Keycloak init failed
    document.getElementById('root').innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#6b7280">Unable to connect to authentication server.</div>';
  });
