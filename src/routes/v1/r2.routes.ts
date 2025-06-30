import { Router } from 'express';
import multer from 'multer';
import { R2Controller } from '../../controllers/r2.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// Configure multer for file uploads with memory storage for fast processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB per file
  },
  fileFilter: (req, file, cb) => {
    // Allow only video files
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  },
});

// All routes require authentication
router.use(authMiddleware);

// Get all videos from R2
router.get('/videos', R2Controller.getVideos);

// Get video stream URL
router.get('/videos/:key/stream', R2Controller.getVideoStream);

// Upload video to R2
router.post('/upload', upload.single('video'), R2Controller.uploadVideo);

// Delete video from R2
router.delete('/videos/:key', R2Controller.deleteVideo);

// Get storage statistics
router.get('/stats', R2Controller.getStorageStats);

export default router; 