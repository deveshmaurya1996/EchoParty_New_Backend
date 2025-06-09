import { Router } from 'express';
import { MediaController } from '../../controllers/media.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { query, param } from 'express-validator';

const router = Router();

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

// Google Drive routes
router.get('/drive/videos', MediaController.getDriveVideos);

router.get(
  '/drive/video/:fileId/stream',
  validate([
    param('fileId').trim().isLength({ min: 1 }),
  ]),
  MediaController.getDriveVideoStream
);

export default router;