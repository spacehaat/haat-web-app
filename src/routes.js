import { canSeeScreen, defaultPathForUser } from '@spacehaat/access';
import { getLastRoute } from './navigation.js';

export { defaultPathForUser };

export const PATHS = {
  login: '/login',
  dashboard: '/dashboard',
  inbox: '/inbox',
  browser: '/browser',
  match: '/match',
  proposal: '/proposal',
  proposals: '/proposals',
  leads: '/leads',
  freshness: '/freshness',
  users: '/users',
};

export function screenToPath(screen) {
  return PATHS[screen] || PATHS.dashboard;
}

export function pathToScreen(pathname) {
  if (/^\/proposals\/[^/]+\/edit$/.test(pathname)) return 'proposal';
  const base = pathname.replace(/\/$/, '') || '/';
  const map = {
    '/': 'dashboard',
    [PATHS.login]: 'login',
    [PATHS.dashboard]: 'dashboard',
    [PATHS.inbox]: 'inbox',
    [PATHS.browser]: 'browser',
    [PATHS.match]: 'match',
    [PATHS.proposal]: 'proposal',
    [PATHS.proposals]: 'proposals',
    [PATHS.leads]: 'leads',
    [PATHS.freshness]: 'freshness',
    [PATHS.users]: 'users',
  };
  return map[base] || null;
}

export function browserListingPath(id) {
  return `/browser?listing=${encodeURIComponent(id)}`;
}

export function proposalEditPath(id) {
  return `/proposals/${encodeURIComponent(id)}/edit`;
}

export function resolvePostLoginPath(user, currentPath = '') {
  const pathname = (currentPath || '').split('?')[0] || '';
  if (pathname && pathname !== PATHS.login && pathname !== '/' && canSeePath(user, pathname)) {
    return currentPath;
  }
  const last = getLastRoute();
  if (last) {
    const lastPath = last.split('?')[0];
    if (canSeePath(user, lastPath)) return last;
  }
  return defaultPathForUser(user);
}

export function canSeePath(user, pathname) {
  const base = pathname.replace(/\/$/, '') || '/';
  if (base === '/') return false;
  const screen = pathToScreen(pathname);
  if (!screen || screen === 'login') return pathname === PATHS.login;
  return canSeeScreen(user, screen);
}
