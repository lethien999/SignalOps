import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { getOAuthConfig } from '../../../config/oauth.config';

export interface GoogleProfile {
  id: string;
  displayName: string;
  emails: Array<{ value: string; verified?: boolean }>;
  name?: {
    familyName?: string;
    givenName?: string;
  };
  photos?: Array<{ value: string }>;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    const config = getOAuthConfig();
    super({
      clientID: config.google.clientID,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<void> {
    // Validate profile has email
    if (!profile.emails || profile.emails.length === 0) {
      return done(new Error('Google profile does not contain email'), null);
    }

    const email = profile.emails[0].value;
    if (!email) {
      return done(new Error('Google profile email is invalid'), null);
    }

    // Return profile data for controller to use
    const user = {
      provider: 'google',
      providerId: profile.id,
      email,
      displayName: profile.displayName,
      firstName: profile.name?.givenName,
      lastName: profile.name?.familyName,
      avatar: profile.photos?.[0]?.value,
      accessToken,
      refreshToken,
    };

    done(null, user);
  }
}
