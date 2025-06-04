import dotenv from 'dotenv';
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
    drive: {
      clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_DRIVE_REDIRECT_URI || '',
      scope: process.env.GOOGLE_DRIVE_SCOPE || '',
    },
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
};