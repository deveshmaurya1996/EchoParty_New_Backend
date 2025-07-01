import axios from 'axios';
import { config } from '../config/index.js';
import { YouTubeVideo } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class MediaService {
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
}