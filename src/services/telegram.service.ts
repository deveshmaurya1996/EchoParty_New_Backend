import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

interface TelegramUploadResult {
  fileId: string;
  messageId: string;
  streamUrl: string;
}

interface TelegramMessage {
  message_id: string;
  video: {
    file_id: string;
    file_name: string;
    mime_type: string;
    file_size: number;
  };
  date: number;
}

export class TelegramService {
  private static readonly API_BASE = config.telegram.apiBaseUrl;
  private static readonly BOT_TOKEN = config.telegram.botToken;
  private static readonly CHANNEL_ID = config.telegram.channelId;

  static async uploadVideo(fileBuffer: Buffer, filename: string): Promise<TelegramUploadResult> {
    try {
      // Create form data
      const form = new FormData();
      form.append('chat_id', this.CHANNEL_ID);
      form.append('video', Readable.from(fileBuffer), { filename });

      // Upload to Telegram
      const response = await axios.post(
        `${this.API_BASE}/bot${this.BOT_TOKEN}/sendVideo`,
        form,
        { headers: form.getHeaders() }
      );

      if (!response.data.ok) {
        throw new Error('Failed to upload video to Telegram');
      }

      const fileId = response.data.result.video.file_id;
      const messageId = response.data.result.message_id;

      // Get file path
      const fileInfo = await axios.get(
        `${this.API_BASE}/bot${this.BOT_TOKEN}/getFile?file_id=${fileId}`
      );

      if (!fileInfo.data.ok) {
        throw new Error('Failed to get video file info from Telegram');
      }

      const filePath = fileInfo.data.result.file_path;
      const streamUrl = this.getProxiedStreamUrl(fileId);

      return {
        fileId,
        messageId,
        streamUrl
      };
    } catch (error) {
      logger.error('Telegram video upload error:', error);
      throw error;
    }
  }

  static async getChannelMessages(limit: number = 100): Promise<TelegramMessage[]> {
    try {
      const response = await axios.get(
        `${this.API_BASE}/bot${this.BOT_TOKEN}/getUpdates`,
        {
          params: {
            chat_id: this.CHANNEL_ID,
            limit,
            allowed_updates: ['channel_post']
          }
        }
      );

      if (!response.data.ok) {
        throw new Error('Failed to get channel messages from Telegram');
      }

      return response.data.result
        .filter((update: any) => update.channel_post?.video)
        .map((update: any) => ({
          message_id: update.channel_post.message_id,
          video: {
            file_id: update.channel_post.video.file_id,
            file_name: update.channel_post.video.file_name,
            mime_type: update.channel_post.video.mime_type,
            file_size: update.channel_post.video.file_size
          },
          date: update.channel_post.date
        }));
    } catch (error) {
      logger.error('Failed to get channel messages:', error);
      throw error;
    }
  }

  static async deleteVideo(messageId: string): Promise<void> {
    try {
      await axios.post(`${this.API_BASE}/bot${this.BOT_TOKEN}/deleteMessage`, {
        chat_id: this.CHANNEL_ID,
        message_id: messageId
      });
    } catch (error) {
      logger.error('Telegram video deletion error:', error);
      throw error;
    }
  }

  static getProxiedStreamUrl(fileId: string): string {
    // Return a URL that goes through our backend to hide the bot token
    return `/api/v1/media/stream/${fileId}`;
  }
} 