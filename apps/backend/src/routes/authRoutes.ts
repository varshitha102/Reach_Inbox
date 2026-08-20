import { Router } from 'express';
import passport from '../auth/passport.js';
import { AuthController } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  async (req: any, res) => {
    const sessionToken = await AuthController.createSession(req.user.id, res);
    
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${sessionToken}`);
  }
);

router.get('/session', requireAuth, AuthController.getSession);
router.post('/logout', AuthController.logout);

export default router;
