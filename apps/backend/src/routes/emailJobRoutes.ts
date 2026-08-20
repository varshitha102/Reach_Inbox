import { Router } from 'express';
import { EmailJobController } from '../controllers/emailJobController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.post('/', EmailJobController.create);
router.post('/bulk', EmailJobController.bulkCreate);
router.get('/', EmailJobController.list);
router.get('/campaigns', EmailJobController.listCampaigns);
router.get('/search', EmailJobController.search);
router.get('/stats', EmailJobController.getStats);
router.get('/:id', EmailJobController.getById);
router.post('/:id/cancel', EmailJobController.cancel);
router.delete('/campaign/:campaignId', EmailJobController.deleteByCampaign);
router.delete('/scheduled/all', EmailJobController.deleteAllScheduled);

export default router;
