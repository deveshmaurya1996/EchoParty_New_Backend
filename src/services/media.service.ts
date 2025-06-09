import axios from 'axios';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config';
import { GoogleDriveFile, YouTubeVideo } from '../types';
import { logger } from '../utils/logger';
import { AuthService } from './auth.service';

export class MediaService {
  private static oauth2Client = new OAuth2Client(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectLink
  );

  static async searchYouTube(query: string): Promise<YouTubeVideo[]> {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          maxResults: 10,
          key: config.youtube.apiKey,
        },
      });

      const videoIds = response.data.items.map((item: any) => item.id.videoId).join(',');

      const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'contentDetails,snippet',
          id: videoIds,
          key: config.youtube.apiKey,
        },
      });

      return detailsResponse.data.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium.url,
        duration: item.contentDetails.duration,
        channelTitle: item.snippet.channelTitle,
      }));
    } catch (error) {
      logger.error('YouTube search error:', error);
      throw new Error('Failed to search YouTube videos');
    }
  }

  static async getYouTubeVideo(videoId: string): Promise<YouTubeVideo> {
    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'snippet,contentDetails',
          id: videoId,
          key: config.youtube.apiKey,
        },
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Video not found');
      }

      const item = response.data.items[0];
      return {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium.url,
        duration: item.contentDetails.duration,
        channelTitle: item.snippet.channelTitle,
      };
    } catch (error) {
      logger.error('YouTube video fetch error:', error);
      throw new Error('Failed to fetch YouTube video');
    }
  }

  static async getDriveVideos(userRefreshToken: string): Promise<GoogleDriveFile[]> {
    try {
      // Get access token from refresh token
      const accessToken = await AuthService.getGoogleTokenFromRefreshToken(userRefreshToken);
      
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      // First, find or create the "Echo Party Videos" folder
      const folderResponse = await drive.files.list({
        q: "name='Echo Party Videos' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id, name)',
        spaces: 'drive',
      });

      if (!folderResponse.data.files || folderResponse.data.files.length === 0) {
        // Create the folder if it doesn't exist
        const createFolderResponse = await drive.files.create({
          requestBody: {
            name: 'Echo Party Videos',
            mimeType: 'application/vnd.google-apps.folder',
          },
          fields: 'id',
        });

        const folderId = createFolderResponse.data.id;
        logger.info(`Created "Echo Party Videos" folder with ID: ${folderId}`);
        return []; // No videos yet in new folder
      }

      const folderId = folderResponse.data.files[0].id;

      // Get all video files from the folder
      const videosResponse = await drive.files.list({
        q: `'${folderId}' in parents and (mimeType contains 'video/' or mimeType='application/x-matroska') and trashed=false`,
        fields: 'files(id, name, size, mimeType, webViewLink, webContentLink, thumbnailLink, createdTime, modifiedTime)',
        orderBy: 'modifiedTime desc',
        pageSize: 100,
      });

      const videos = videosResponse.data.files || [];

      // Process videos
      for (const video of videos) {
        // Generate thumbnail if not available
        if (!video.thumbnailLink) {
          video.thumbnailLink = `https://drive.google.com/thumbnail?id=${video.id}&sz=w320`;
        }

        // Ensure video has proper permissions
        try {
          await drive.permissions.create({
            fileId: video.id!,
            requestBody: {
              role: 'reader',
              type: 'anyone',
              allowFileDiscovery: false,
            },
          });
        } catch (error) {
          logger.debug(`Permission might already exist for file ${video.id}`);
        }
      }

      return videos as GoogleDriveFile[];
    } catch (error: any) {
      logger.error('Google Drive fetch error:', error);
      if (error.message?.includes('insufficient authentication scopes')) {
        throw new Error('insufficient authentication scopes');
      }
      throw new Error('Failed to fetch videos from Google Drive');
    }
  }

  static async getDriveVideoStreamUrl(userRefreshToken: string, fileId: string): Promise<string> {
    try {
      const accessToken = await AuthService.getGoogleTokenFromRefreshToken(userRefreshToken);
      
      // For streaming, we'll use the webContentLink with the access token
      return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${accessToken}`;
    } catch (error) {
      logger.error('Get drive video stream error:', error);
      throw new Error('Failed to get video stream URL');
    }
  }
}