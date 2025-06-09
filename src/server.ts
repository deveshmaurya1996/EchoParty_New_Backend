import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { connectDatabase } from './config/database';
import { SocketService } from './services/socket.service';
import { logger } from './utils/logger';
import { errorHandler, notFound } from './middleware/error.middleware';
import routes from './routes/v1';

const app = express();
const server = createServer(app);

// Trust proxy - important for rate limiting behind a reverse proxy
app.set('trust proxy', 1);

// Initialize Socket.IO
const socketService = new SocketService(server);

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP',
});

app.use('/api/', limiter);



// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Echo Party API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});


// Routes
app.use('/api/v1', routes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    
    server.listen(config.app.port, '0.0.0.0', () => {
      logger.info(`
        ╔═════════════════════════════════════════════════════════════════╗
        ║                                                                 ║
        ║            🎬 Echo Party Server 🎬                              ║
        ║                                                                 ║
        ║   Server Status: RUNNING ✅                                     ║
        ║   Port: ${config.app.port}                                                    ║
        ║   Environment: ${config.app.env}                                      ║
        ║   Database: Connected                                           ║
        ║   Socket.IO: Active                                             ║
        ║                                                                 ║
        ║   API Base URL: ${config.app.baseUrl}/api/v1                    ║
        ║   Health Check: ${config.app.baseUrl}/api/v1/health             ║
        ║                                                                 ║
        ║   Started at: ${new Date().toLocaleString()}                              ║
        ║                                                                 ║
        ╚═════════════════════════════════════════════════════════════════╝
                `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app, socketService };