let _kc = null;

export function setKeycloak(kc) {
  _kc = kc;
}

export function getToken() {
  return _kc?.token ?? null;
}

export async function authFetch(url, options = {}) {
  if (_kc?.authenticated) {
    try {
      await _kc.updateToken(30);
    } catch {
      // token refresh failed
    }
  }
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(_kc?.token ? { Authorization: `Bearer ${_kc.token}` } : {}),
    },
  });
}
