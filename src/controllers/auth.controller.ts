import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { IUser } from '../types';
import { logger } from '../utils/logger';

export class AuthController {
  // static async googleCallback(req: Request, res: Response) {
  //   try {
  //     if (!req.user) {
  //       res.send(`
  //         <html>
  //           <head>
  //             <title>Authentication Failed</title>
  //             <script>
  //               window.location.href = "echoparty://oauth2redirect?error=auth_failed";
  //             </script>
  //           </head>
  //           <body>
  //             <p>Authentication failed. Redirecting to app...</p>
  //             <a href="echoparty://oauth2redirect?error=auth_failed">Click here if not redirected automatically</a>
  //           </body>
  //         </html>
  //       `);
  //       return;
  //     }

  //     const { accessToken, refreshToken } = await AuthService.generateTokens(req.user as IUser);
      
  //     // Send HTML that will redirect to the app
  //     res.send(`
  //       <html>
  //         <head>
  //           <title>Redirecting to Echo Party...</title>
  //           <script>
  //             window.location.href = "echoparty://oauth2redirect?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}";
  //           </script>
  //         </head>
  //         <body>
  //           <p>Redirecting to Echo Party...</p>
  //           <a href="echoparty://oauth2redirect?access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}">Click here if not redirected automatically</a>
  //         </body>
  //       </html>
  //     `);
  //   } catch (error) {
  //     console.error('Google callback error:', error);
  //     res.send(`
  //       <html>
  //         <head>
  //           <title>Authentication Error</title>
  //           <script>
  //             window.location.href = "echoparty://oauth2redirect?error=auth_failed";
  //           </script>
  //         </head>
  //         <body>
  //           <p>Authentication error. Redirecting to app...</p>
  //           <a href="echoparty://oauth2redirect?error=auth_failed">Click here if not redirected automatically</a>
  //         </body>
  //       </html>
  //     `);
  //   }
  // }


  static googleCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = req.user as IUser;
      const { accessToken, refreshToken } = await AuthService.generateTokens(user);
      // Redirect to frontend with tokens

      const redirectUrl = new URL(`${process.env.FRONTEND_URL}`);
      redirectUrl.searchParams.append('accessToken', encodeURIComponent(accessToken));
      redirectUrl.searchParams.append('refreshToken', encodeURIComponent(refreshToken));
      console.log("redirectUrl",redirectUrl)
      res.redirect(redirectUrl.toString());
    } catch (error) {
      logger.error('Google auth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
    }
  };

  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      const tokens = await AuthService.refreshTokens(refreshToken);
      res.json(tokens);
    } catch (error) {
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      await AuthService.logout(req.user as IUser);
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Logout failed' });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      const profile = await AuthService.getUserProfile(req.user as IUser);
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }
}