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

/**
 * Handle OAuth callback from URL parameters
 * Extracts token and provider from URL and stores auth data
 */
export function handleOAuthCallback(): { success: boolean; provider?: string; error?: string } {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Client-side only' };
  }

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const provider = params.get('provider');
  const error = params.get('error');

  if (error) {
    return { success: false, error: decodeURIComponent(error) };
  }

  if (!token) {
    return { success: false, error: 'No token received from OAuth provider' };
  }

  // Decode token to extract user info
  const decoded = decodeJwt(token);
  if (!decoded) {
    return { success: false, error: 'Invalid token format' };
  }

  // Store auth data
  const authData: AuthToken = {
    token,
    user: {
      id: decoded.userId,
      email: decoded.email,
      tenantId: decoded.tenantId,
      roleId: decoded.roleId,
    },
  };

  setAuthToken(authData);

  // Clean up URL
  window.history.replaceState({}, document.title, window.location.pathname);

  return { success: true, provider: provider || 'unknown' };
}

/**
 * Get OAuth login URL for a provider
 */
export function getOAuthLoginUrl(provider: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return `${baseUrl}/auth/oauth/${provider}`;
}

/**
 * Get OAuth link URL for a provider (requires authentication)
 */
export function getOAuthLinkUrl(provider: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  return `${baseUrl}/auth/oauth/link/${provider}`;
}

export interface LinkedProvider {
  provider: string;
  email: string;
  linkedAt: string;
}

/**
 * Fetch linked OAuth providers for current user
 */
export async function getLinkedProviders(): Promise<LinkedProvider[]> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/me`, {
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  const data = await response.json();
  return data.user?.oauthProviders || [];
}

/**
 * Unlink an OAuth provider
 */
export async function unlinkOAuthProvider(provider: string, password: string): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/oauth/${provider}/unlink`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ password }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to unlink provider');
  }
}
