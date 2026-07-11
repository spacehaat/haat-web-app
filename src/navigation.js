const LAST_ROUTE_KEY = 'spacehaat.lastRoute';

let appNavigate = null;

export function registerNavigate(navigateFn) {
  appNavigate = navigateFn;
}

export function navigateTo(path, options = {}) {
  if (appNavigate) appNavigate(path, options);
}

export function persistRoute(pathname, search = '') {
  const full = pathname + search;
  if (full === '/' || full.startsWith('/login')) return;
  try {
    localStorage.setItem(LAST_ROUTE_KEY, full);
  } catch {
    // ignore quota / private mode
  }
}

export function getLastRoute() {
  try {
    const value = localStorage.getItem(LAST_ROUTE_KEY);
    if (!value || value === '/' || value.startsWith('/login')) return null;
    return value;
  } catch {
    return null;
  }
}
