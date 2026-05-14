import { createContext, useContext } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ keycloak, children }) {
  const user = {
    username: keycloak.tokenParsed?.preferred_username ?? 'User',
    name: keycloak.tokenParsed?.name ?? '',
    email: keycloak.tokenParsed?.email ?? '',
    roles: keycloak.realmAccess?.roles ?? [],
  };

  return (
    <AuthContext.Provider value={{ user, keycloak, logout: () => keycloak.logout() }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
