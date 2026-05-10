/**
 * OAuth Configuration
 * Centralized OAuth settings for Google and GitHub providers
 */

export interface OAuthProvider {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
}

export interface OAuthConfig {
  google: OAuthProvider;
  github: OAuthProvider;
}

export const getOAuthConfig = (): OAuthConfig => {
  const baseUrl = process.env.OAUTH_BASE_URL || 'http://localhost:3001';

  return {
    google: {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: `${baseUrl}/auth/oauth/google/callback`,
    },
    github: {
      clientID: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackURL: `${baseUrl}/auth/oauth/github/callback`,
    },
  };
};

/**
 * Validate OAuth configuration
 * Throws error if required env vars are missing
 */
export const validateOAuthConfig = (config: OAuthConfig): void => {
  const isDev = process.env.NODE_ENV === 'development';

  if (!isDev) {
    if (!config.google.clientID || !config.google.clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required in production');
    }
    if (!config.github.clientID || !config.github.clientSecret) {
      throw new Error('GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are required in production');
    }
  }
};
