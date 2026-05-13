import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { getOAuthConfig } from '../../../config/oauth.config';

export interface GitHubProfile {
  id: string;
  username: string;
  displayName?: string;
  emails?: Array<{ value: string; primary?: boolean; verified?: boolean }>;
  photos?: Array<{ value: string }>;
  _raw?: string;
  _json?: any;
}

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor() {
    const config = getOAuthConfig();
    super({
      clientID: config.github.clientID,
      clientSecret: config.github.clientSecret,
      callbackURL: config.github.callbackURL,
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GitHubProfile,
    done: (error: Error | null, user?: unknown) => void
  ): Promise<void> {
    // Validate profile has email
    if (!profile.emails || profile.emails.length === 0) {
      return done(
        new Error('GitHub profile does not contain email. Please ensure email is public on GitHub.')
      );
    }

    // Find primary or first email
    const primaryEmail = profile.emails.find((e) => e.primary);
    const email = primaryEmail?.value || profile.emails[0].value;

    if (!email) {
      return done(new Error('GitHub profile email is invalid'));
    }

    // Return profile data for controller to use
    const user = {
      provider: 'github',
      providerId: profile.id,
      email,
      displayName: profile.displayName || profile.username,
      username: profile.username,
      avatar: profile.photos?.[0]?.value,
      accessToken,
      refreshToken,
    };

    done(null, user);
  }
}
