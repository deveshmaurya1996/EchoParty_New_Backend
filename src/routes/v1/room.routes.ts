import { Router } from 'express';
import { RoomController } from '../../controllers/room.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { body, param, query } from 'express-validator';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Create room
router.post(
  '/',
  validate([
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Room name is required'),
    body('type').isIn(['youtube', 'movie', 'music', 'other']).withMessage('Invalid room type'),
  ]),
  RoomController.createRoom
);

// Search rooms
router.get(
  '/search',
  validate([
    query('q').trim().isLength({ min: 1 }).withMessage('Search query is required'),
  ]),
  RoomController.searchRooms
);

// Get rooms with pagination
router.get(
  '/',
  validate([
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('type').optional().isIn(['youtube', 'movie', 'music', 'other']),
    query('active').optional().isBoolean(),
    query('roomFilterType').optional().isIn(['recent', 'created', 'participated']),
  ]),
  RoomController.getRooms
);

// Get specific room by room code
router.get(
  '/code/:roomCode',
  validate([
    param('roomCode').isAlphanumeric().isLength({ min: 6, max: 6 }),
  ]),
  RoomController.getRoom
);

// Get room stats by room code
router.get(
  '/code/:roomCode/stats',
  validate([
    param('roomCode').isAlphanumeric().isLength({ min: 6, max: 6 }),
  ]),
  RoomController.getRoomStats
);

// Join room by room code
router.post(
  '/code/:roomCode/join',
  validate([
    param('roomCode').isAlphanumeric().isLength({ min: 6, max: 6 }),
  ]),
  RoomController.joinRoom
);

// Leave room by ID
router.post(
  '/:roomId/leave',
  validate([
    param('roomId').isMongoId(),
  ]),
  RoomController.leaveRoom
);

// Update room by ID
router.patch(
  '/:roomId',
  validate([
    param('roomId').isMongoId(),
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('isActive').optional().isBoolean(),
  ]),
  RoomController.updateRoom
);

// Update room permissions by ID
router.patch(
  '/:roomId/permissions',
  validate([
    param('roomId').isMongoId(),
    body('allowParticipantControl').optional().isBoolean(),
    body('allowedControllers').optional().isArray(),
    body('allowedControllers.*').optional().isMongoId(),
  ]),
  RoomController.updateRoomPermissions
);

// Grant/revoke control permission for specific participant by ID
router.post(
  '/:roomId/permissions/grant',
  validate([
    param('roomId').isMongoId(),
    body('participantId').isMongoId().withMessage('Participant ID is required'),
    body('grant').isBoolean().withMessage('Grant status is required'),
  ]),
  RoomController.grantControlPermission
);

// Remove participant by ID
router.delete(
  '/:roomId/participants/:participantId',
  validate([
    param('roomId').isMongoId(),
    param('participantId').isMongoId(),
  ]),
  RoomController.removeParticipant
);

// Get room messages by ID
router.get(
  '/:roomId/messages',
  validate([
    param('roomId').isMongoId(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('before').optional().isMongoId(),
  ]),
  RoomController.getRoomMessages
);

// Delete room by ID
router.delete(
  '/:roomId',
  validate([
    param('roomId').isMongoId(),
  ]),
  RoomController.deleteRoom
);

export default router;