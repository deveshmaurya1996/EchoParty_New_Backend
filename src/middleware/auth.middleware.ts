import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile, VerifyCallback } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt, VerifiedCallback } from 'passport-jwt';
import { AuthRequest } from '../types';
import { User } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import { config } from '../config';
import { IUser } from '../types';

// Define interfaces for the JWT payload and Google Profile
interface JwtPayload {
  sub: string;
  [key: string]: any;
}

// Configure Passport strategies
passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.redirectLink,
      passReqToCallback: true,
    },
    async (
      req: Request,
      accessToken: string,
      refreshToken: string,
      profile: GoogleProfile,
      done: VerifyCallback
    ) => {
      try {
        const user = await AuthService.findOrCreateUser(profile);
        return done(null, user);
      } catch (error) {
        return done(error as Error, false);
      }
    }
  )
);

// JWT Strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.jwt.secret,
    },
    async (payload: JwtPayload, done: VerifiedCallback) => {
      try {
        const user = await User.findById(payload.sub);
        if (!user) {
          return done(null, false);
        }
        return done(null, user);
      } catch (error) {
        return done(error as Error, false);
      }
    }
  )
);

// JWT Authentication middleware
export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  passport.authenticate(
    'jwt',
    { session: false },
    (err: Error | null, user: IUser | false) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      (req as AuthRequest).user = user as IUser;
      next();
    }
  )(req, res, next);
};

// Google OAuth middleware
export const authenticateGoogle = passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account',
  accessType: 'offline',
} as passport.AuthenticateOptions);

export const authenticateGoogleCallback = passport.authenticate('google', {
  session: false,
  successFlash: true,
  failureFlash: true,
  successRedirect: `${config.google.redirectLink}?status=success`,
  failureRedirect: `${config.google.redirectLink}?error=auth_failed`,
} as passport.AuthenticateOptions);