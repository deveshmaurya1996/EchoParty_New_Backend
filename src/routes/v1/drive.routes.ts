import { Router } from 'express';
import { DriveController } from '../../controllers/drive.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// Get Drive videos
router.get('/videos', authMiddleware, DriveController.getVideos);

// Get video stream URL
router.get('/videos/:fileId/stream', authMiddleware, DriveController.getVideoStream);

// Stream video content (proxy)
router.get('/videos/:fileId/stream-content', authMiddleware, DriveController.streamVideo);

export default router; 