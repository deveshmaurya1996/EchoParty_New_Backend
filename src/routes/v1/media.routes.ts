import { Router } from 'express';
import multer from 'multer';
import { MediaController } from '../../controllers/media.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';

const router = Router();

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

// All routes require authentication
router.use(authenticateJWT);

// YouTube routes
router.get('/youtube/search', MediaController.searchYouTube);
router.get('/youtube/video/:videoId', MediaController.getYouTubeVideo);

// Google Drive routes
router.get('/drive/auth', MediaController.getDriveAuthUrl);
router.get('/drive/callback', MediaController.handleDriveCallback);
router.post('/drive/upload', upload.single('file'), MediaController.uploadToDrive);

export default router;