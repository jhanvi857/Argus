/**
 * Centralized API configuration and URL builder for Argus frontend.
 * 
 * Supports configuring the backend URL via:
 * 1. VITE_BACKEND_URL in frontend/.env or root .env (e.g., http://localhost:8000 or https://api.argus.com)
 * 2. BACKEND_URL in root .env (forwarded via vite.config.ts)
 * 3. VITE_API_BASE_URL
 * 4. Defaults to '/api' which works out-of-the-box with Vite dev proxy and Nginx reverse proxy.
 */

// Declare compile-time define from vite.config.ts if present
declare const __BACKEND_URL__: string | undefined;

export function getBackendUrl(): string {
  // 1. Injected at compile time via Vite define from BACKEND_URL
  if (typeof __BACKEND_URL__ !== 'undefined' && __BACKEND_URL__) {
    const defined = String(__BACKEND_URL__).trim();
    if (defined && !defined.startsWith('__')) {
      return defined.replace(/\/+$/, '');
    }
  }

  // 2. Vite standard environment variables
  const envUrl = (
    import.meta.env.VITE_BACKEND_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ''
  ).trim();

  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  // 3. Default relative path for local proxy and production nginx
  return '/api';
}

/**
 * Builds a fully-qualified or proxy-compatible API endpoint URL.
 * 
 * Examples:
 *   buildApiUrl('/companies') -> 'http://localhost:8000/companies' (if BACKEND_URL set)
 *   buildApiUrl('/companies') -> '/api/companies' (if using relative /api default)
 *   buildApiUrl('/api/companies') -> 'http://localhost:8000/companies' (strips redundant /api on absolute backend)
 */
export function buildApiUrl(path: string): string {
  const base = getBackendUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // If base is a relative route (e.g., '/api')
  if (base.startsWith('/')) {
    if (cleanPath.startsWith(`${base}/`) || cleanPath === base) {
      return cleanPath;
    }
    return `${base}${cleanPath}`;
  }

  // If base is an absolute URL (e.g. 'http://localhost:8000' or 'https://api.domain.com')
  // Strip any accidental leading '/api/' because backend FastAPI routes are declared at root
  const endpoint = cleanPath.startsWith('/api/') ? cleanPath.slice(4) : cleanPath;
  return `${base}${endpoint}`;
}
