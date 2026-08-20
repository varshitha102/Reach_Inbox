import { Router } from 'express';
import { SenderController } from '../controllers/senderController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/default', SenderController.getDefaultSender);
router.post('/', SenderController.create);
router.get('/', SenderController.list);
router.get('/:id', SenderController.getById);
router.put('/:id', SenderController.update);
router.delete('/:id', SenderController.delete);

export default router;
