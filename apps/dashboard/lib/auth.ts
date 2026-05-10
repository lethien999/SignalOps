/**
 * JWT/Auth utilities for dashboard
 */

export interface AuthToken {
  token: string;
  user: {
    id: string;
    email: string;
    tenantId: string;
    roleId: string;
  };
}

export interface DecodedJwt {
  userId: string;
  tenantId: string;
  email: string;
  roleId: string;
  iat: number;
  exp: number;
}

/**
 * Store JWT token and user info in localStorage and cookies
 */
export function setAuthToken(authData: AuthToken): void {
  // Store in localStorage for client-side access
  localStorage.setItem('auth_token', authData.token);
  localStorage.setItem('auth_user', JSON.stringify(authData.user));

  // Store in cookie for middleware access (7 days expiry)
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 7);
  document.cookie = `auth_token=${authData.token}; expires=${expiryDate.toUTCString()}; path=/`;
}

/**
 * Get JWT token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

/**
 * Get user info from localStorage
 */
export function getAuthUser(): AuthToken['user'] | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('auth_user');
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Clear auth data from localStorage and cookies
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  // Clear cookie
  document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

/**
 * Get Authorization header for API requests
 */
export function getAuthHeader(): { Authorization: string } | Record<string, never> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Decode JWT token (simple client-side decode without verification)
 * WARNING: Only use for display purposes. Don't trust claims for security decisions.
 */
export function decodeJwt(token: string): DecodedJwt | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeJwt(token);
  if (!decoded) return true;

  const now = Math.floor(Date.now() / 1000);
  return now >= decoded.exp;
}
