import React from 'react';
import ReactDOM from 'react-dom/client';
import Keycloak from 'keycloak-js';
import App from './App.jsx';
import { setKeycloak } from './lib/authFetch.js';
import './index.css';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

function render(kc) {
  ReactDOM.createRoot(document.getElementById('root')).render(<App keycloak={kc} />);
}

if (DEV_MODE) {
  const mockKc = {
    authenticated: true,
    token: 'dev-token',
    tokenParsed: { preferred_username: 'dev', name: 'Dev User', email: 'dev@local' },
    realmAccess: { roles: ['debug_admin'] },
    updateToken: () => Promise.resolve(),
    logout: () => { window.location.href = '/'; },
  };
  setKeycloak(mockKc);
  render(mockKc);
} else {
  const keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL || '/auth';
  const kc = new Keycloak({
    url: keycloakUrl,
    realm: import.meta.env.VITE_KEYCLOAK_REALM || 'aion',
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'aion-frontend',
  });

  kc.init({ onLoad: 'login-required', checkLoginIframe: false })
    .then((authenticated) => {
      if (authenticated) {
        setKeycloak(kc);
        setInterval(() => kc.updateToken(30).catch(() => kc.logout()), 30000);
        render(kc);
      }
    })
    .catch(() => {
      document.getElementById('root').innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#6b7280">Unable to connect to authentication server.</div>';
    });
}
