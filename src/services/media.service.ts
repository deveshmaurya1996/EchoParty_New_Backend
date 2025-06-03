import axios from 'axios';
import { google } from 'googleapis';
import { OAuth2Client } from 'googleapis-common';
import { config } from '../config';
import { GoogleDriveFile, YouTubeVideo } from '../types';
import { logger } from '../utils/logger';

export class MediaService {
  private static oauth2Client = new OAuth2Client(
    config.google.drive.clientId,
    config.google.drive.clientSecret,
    config.google.drive.redirectUri
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

  static getGoogleDriveAuthUrl(userId: string): string {
    const scopes = [config.google.drive.scope];
    
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId,
    });
  }

  static async handleDriveCallback(code: string): Promise<any> {
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  static async uploadToDrive(
    tokens: any,
    fileData: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<GoogleDriveFile> {
    try {
      this.oauth2Client.setCredentials(tokens);
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      const response = await drive.files.create({
        requestBody: {
          name: fileName,
          mimeType: mimeType,
        },
        media: {
          mimeType: mimeType,
          body: fileData,
        },
        fields: 'id,name,mimeType,size,webViewLink,webContentLink',
      });

      // Make file publicly accessible
      await drive.permissions.create({
        fileId: response.data.id!,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      return response.data as GoogleDriveFile;
    } catch (error) {
      logger.error('Google Drive upload error:', error);
      throw new Error('Failed to upload to Google Drive');
    }
  }

  static async getDriveFile(tokens: any, fileId: string): Promise<GoogleDriveFile> {
    try {
      this.oauth2Client.setCredentials(tokens);
      const drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      const response = await drive.files.get({
        fileId: fileId,
        fields: 'id,name,mimeType,size,webViewLink,webContentLink',
      });

      return response.data as GoogleDriveFile;
    } catch (error) {
      logger.error('Google Drive file fetch error:', error);
      throw new Error('Failed to fetch Google Drive file');
    }
  }
}