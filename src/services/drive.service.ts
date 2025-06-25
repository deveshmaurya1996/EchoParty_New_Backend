import { google } from 'googleapis';
import { User } from '../models/user.model';
import { logger } from '../utils/logger';
import { AuthService } from './auth.service';
import { config } from '../config';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  createdTime: string;
  modifiedTime: string;
  duration?: number; // Duration in seconds
}

export class DriveService {
  static async getValidAccessToken(userId: string): Promise<string> {
    const user = await User.findById(userId);
    if (!user || !user.driveAccess || !user.googleTokens) {
      throw new Error('User does not have Drive access');
    }

    const { access_token, refresh_token } = user.googleTokens;
    
    if (!access_token) {
      throw new Error('No access token available');
    }

    // Try to use the current access token first
    try {
      // Test the token by making a simple API call
      const testDrive = google.drive({ 
        version: 'v3', 
        headers: {
          Authorization: `Bearer ${access_token}`
        }
      });
      
      await testDrive.files.list({ pageSize: 1 });
      return access_token; // Token is still valid
    } catch (error: any) {
      logger.info('Access token expired, attempting to refresh...');
      
      // Token is expired, try to refresh it
      if (!refresh_token) {
        logger.error('No refresh token available for user:', userId);
        throw new Error('DRIVE_TOKEN_EXPIRED_NO_REFRESH: Access token has expired and no refresh token is available. Please re-authenticate with Google Drive.');
      }

      try {
        const newAccessToken = await AuthService.getGoogleTokenFromRefreshToken(refresh_token);
        
        // Update the user's tokens with the new access token
        const updatedTokens = {
          ...user.googleTokens,
          access_token: newAccessToken
        };
        
        await AuthService.updateGoogleTokens(userId, updatedTokens);
        logger.info('Successfully refreshed access token');
        
        return newAccessToken;
      } catch (refreshError) {
        logger.error('Failed to refresh access token:', refreshError);
        throw new Error('DRIVE_REFRESH_FAILED: Failed to refresh access token. Please re-authenticate with Google Drive.');
      }
    }
  }

  static async getDriveVideos(userId: string): Promise<DriveFile[]> {
    try {
      logger.info('Getting Drive videos for user:', userId);
      
      // Get a valid access token (with refresh if needed)
      const accessToken = await this.getValidAccessToken(userId);

      logger.info('Making Drive API request with valid access token');
      const drive = google.drive({ 
        version: 'v3', 
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      // Search for video files
      const response = await drive.files.list({
        q: "mimeType contains 'video/' and trashed=false",
        fields: 'files(id,name,mimeType,size,thumbnailLink,webViewLink,createdTime,modifiedTime,videoMediaMetadata)',
        orderBy: 'modifiedTime desc',
        pageSize: 50,
      });

      const videos = (response.data.files || []).map(file => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: file.size,
        thumbnailLink: file.thumbnailLink,
        webViewLink: file.webViewLink,
        createdTime: file.createdTime!,
        modifiedTime: file.modifiedTime!,
        duration: file.videoMediaMetadata?.durationMillis 
          ? Math.round(parseInt(file.videoMediaMetadata.durationMillis) / 1000) 
          : undefined,
      }));

      logger.info('Found Drive videos:', videos.length);
      return videos;
    } catch (error) {
      logger.error('Error fetching Drive videos:', error);
      throw error;
    }
  }

  static async getVideoStreamUrl(userId: string, fileId: string): Promise<string> {
    try {
      // Get a valid access token (with refresh if needed)
      const accessToken = await this.getValidAccessToken(userId);

      const drive = google.drive({ 
        version: 'v3', 
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      // Get file details
      const file = await drive.files.get({
        fileId,
        fields: 'id,name,mimeType,size',
      });

      if (!file.data.mimeType?.includes('video/')) {
        throw new Error('File is not a video');
      }

      // Make the file publicly accessible temporarily
      try {
        await drive.permissions.create({
          fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone'
          }
        });
        
        logger.info('Made file public for streaming:', fileId);
      } catch (permissionError) {
        logger.warn('Failed to make file public, file might already be public:', permissionError);
      }

      // Return a direct streaming URL that supports range requests
      // This URL format supports proper streaming with seeking
      const streamUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      
      logger.info('Generated streaming URL for file:', fileId);
      return streamUrl;
    } catch (error) {
      logger.error('Error getting video stream URL:', error);
      throw error;
    }
  }

  static async makeFilePublic(userId: string, fileId: string): Promise<void> {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      
      const drive = google.drive({ 
        version: 'v3', 
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      // Make file publicly accessible
      await drive.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      logger.info('Made file public:', fileId);
    } catch (error) {
      logger.error('Error making file public:', error);
      throw error;
    }
  }
} 