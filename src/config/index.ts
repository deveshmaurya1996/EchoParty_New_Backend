import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  app: {
    name: process.env.APP_NAME || 'Echo Party',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  },
  db: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/echo-party',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectLink: process.env.GOOGLE_AUTH_REDIRECT_LINK,
  },
  cloudflare: {
    r2: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
      accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY || '',
      bucketName: process.env.CLOUDFLARE_BUCKET_NAME || '',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || '',
      publicUrl: process.env.CLOUDFLARE_PUBLIC_URL || '',
    },
    stream: {
      token: process.env.CLOUDFLARE_STREAM_TOKEN || '',
    }
  },
  storage: {
    maxTotalSize: 1024 * 1024 * 1024, // 1GB
    maxFileSize: 100 * 1024 * 1024, // 100MB
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY || '',
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  },
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8081'],
  },
  upload: {
    maxFileSize: process.env.MAX_FILE_SIZE || '100mb',
  },
  socket: {
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT || '60000', 10),
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL || '25000', 10),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '10', 10),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    channelId: process.env.TELEGRAM_CHANNEL_ID || '',
    apiBaseUrl: 'https://api.telegram.org',
  },
};