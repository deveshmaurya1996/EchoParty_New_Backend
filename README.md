# Echo Party Backend

A real-time video sharing platform backend built with Node.js, Express, and MongoDB.

## Features

- User authentication and authorization
- Video upload and streaming
- Real-time video synchronization
- Room management for watching together
- Notifications system

## Prerequisites

- Node.js 16+
- MongoDB 4.4+
- Telegram Bot Token and Channel
- Cloudflare R2 Account

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/echo-party

   # JWT Configuration
   JWT_SECRET=your-jwt-secret
   JWT_EXPIRES_IN=7d

   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY=your-private-key
   FIREBASE_CLIENT_EMAIL=your-client-email

   # Cloudflare R2 Configuration
   CLOUDFLARE_ACCOUNT_ID=your-account-id
   CLOUDFLARE_ACCESS_KEY_ID=your-access-key-id
   CLOUDFLARE_SECRET_ACCESS_KEY=your-secret-access-key
   CLOUDFLARE_BUCKET_NAME=your-bucket-name
   CLOUDFLARE_R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   CLOUDFLARE_PUBLIC_URL=https://<subdomain>.r2.dev

   # Telegram Configuration
   TELEGRAM_BOT_TOKEN=your-bot-token
   TELEGRAM_CHANNEL_ID=your-channel-id
   ```

## Telegram Setup

1. Create a new bot using [@BotFather](https://t.me/botfather) on Telegram
2. Create a new private channel
3. Add your bot as an admin to the channel with posting permissions
4. Get your channel ID (it will be in the format @your_channel_username or -1001234567890)
5. Add the bot token and channel ID to your `.env` file

## Development

```bash
npm run dev
```

## Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register a new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh-token` - Refresh access token

### Media
- `POST /api/v1/media/upload` - Upload a video
- `GET /api/v1/media/user` - Get user's videos
- `GET /api/v1/media/:videoId` - Get video details
- `GET /api/v1/media/stream/:fileId` - Stream video (public)
- `DELETE /api/v1/media/:videoId` - Delete video

### Rooms
- `POST /api/v1/rooms` - Create a room
- `GET /api/v1/rooms` - Get all rooms
- `GET /api/v1/rooms/:roomId` - Get room details
- `DELETE /api/v1/rooms/:roomId` - Delete room

## License

ISC