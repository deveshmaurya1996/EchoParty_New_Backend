import { Router } from 'express';
import { RoomController } from '../../controllers/room.controller';
import { authenticateJWT } from '../../middleware/auth.middleware';
import { validate, schemas } from '../../middleware/validation.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateJWT);

// Room CRUD operations
router.post('/', validate(schemas.createRoom), RoomController.createRoom);
router.get('/', RoomController.getRooms);
router.get('/:roomId', RoomController.getRoom);
router.put('/:roomId', validate(schemas.updateRoom), RoomController.updateRoom);
router.delete('/:roomId', RoomController.deleteRoom);

// Room actions
router.post('/:roomId/join', RoomController.joinRoom);
router.post('/:roomId/leave', RoomController.leaveRoom);

export default router;