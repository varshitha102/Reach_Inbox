import { Router } from 'express';
import authRoutes from './authRoutes.js';
import emailJobRoutes from './emailJobRoutes.js';
import senderRoutes from './senderRoutes.js';
import campaignRoutes from './campaignRoutes.js';
import uploadRoutes from './uploadRoutes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/email-jobs', emailJobRoutes);
router.use('/senders', senderRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/uploads', uploadRoutes);

export default router;
