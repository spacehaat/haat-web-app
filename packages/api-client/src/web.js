import { createApiClient } from './client.js';
import { bindLegacyApiExports } from './methods.js';

/**
 * Cookie-session API client for the Vite web app.
 * @param {{ onUnauthorized?: () => void }} [options]
 */
export function createWebApi(options = {}) {
  const { request } = createApiClient({
    credentials: 'include',
    onUnauthorized: options.onUnauthorized,
  });

  return bindLegacyApiExports(request);
}

export { createApiClient } from './client.js';
export { createApiMethods, bindLegacyApiExports } from './methods.js';
