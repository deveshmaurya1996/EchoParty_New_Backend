import { Router } from 'express';
import { MediaController } from '../../controllers/media.controller.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validation.middleware';
import { query, param } from 'express-validator';
import multer from 'multer';
import { config } from '../../config';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.storage.maxFileSize, // Use config value (2GB)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/flv', 'video/webm', 'video/mkv'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video files are allowed.'));
    }
  },
});

// All routes require authentication
router.use(authMiddleware);

// YouTube routes
router.get(
  '/youtube/search',
  validate([
    query('q').trim().isLength({ min: 1 }).withMessage('Search query is required'),
  ]),
  MediaController.searchYouTube
);

router.get(
  '/youtube/video/:videoId',
  validate([
    param('videoId').trim().isLength({ min: 1 }),
  ]),
  MediaController.getYouTubeVideo
);

// User video routes
router.post(
  '/videos/upload',
  upload.single('video'),
  MediaController.uploadVideo
);

router.get(
  '/videos',
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  ]),
  MediaController.getUserVideos
);

router.get(
  '/videos/:videoId',
  validate([
    param('videoId').trim().isLength({ min: 1 }).withMessage('Video ID is required'),
  ]),
  MediaController.getVideo
);

router.delete(
  '/videos/:videoId',
  validate([
    param('videoId').trim().isLength({ min: 1 }).withMessage('Video ID is required'),
  ]),
  MediaController.deleteVideo
);

router.post(
  '/videos/:videoId/refresh-url',
  validate([
    param('videoId').trim().isLength({ min: 1 }).withMessage('Video ID is required'),
  ]),
  MediaController.refreshStreamUrl
);

// Public route for streaming videos
router.get('/stream/:fileId', MediaController.streamVideo);

export default router;