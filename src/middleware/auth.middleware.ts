import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { AuthRequest } from '../types';
import { User } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import { config } from '../config';
import { IUser } from '../types';

// Configure Passport strategies
passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.redirectUri,
      passReqToCallback: true,
    },
    async (req: Request, accessToken, refreshToken, profile, done) => {
      try {
        const user = await AuthService.findOrCreateUser(profile);
        return done(null, user);
      } catch (error) {
        return done(error, false);
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
    async (payload, done) => {
      try {
        const user = await User.findById(payload.sub);
        if (!user) {
          return done(null, false);
        }
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// JWT Authentication middleware
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err: any, user: IUser) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    (req as AuthRequest).user = user;
    next();
  })(req, res, next);
};

// Google OAuth middleware
export const authenticateGoogle = passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account',
  accessType: 'offline'
});

export const authenticateGoogleCallback = passport.authenticate('google', {
  session: false,
  failureRedirect: 'echoparty://oauth2redirect?error=auth_failed'
});