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
    console.log('=== BACKEND OAUTH CALLBACK DEBUG ===');
    console.log('User authenticated:', !!req.user);
    console.log('User ID:', req.user?.id);
    console.log('User email:', req.user?.email);
    console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
    
    try {
      const sessionToken = await AuthController.createSession(req.user.id, res);
      console.log('Session token created successfully');
      console.log('Token length:', sessionToken?.length || 0);
      
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${sessionToken}`;
      console.log('Redirecting to:', redirectUrl);
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
    console.log('=== END BACKEND OAUTH CALLBACK DEBUG ===');
  }
);

router.get('/session', requireAuth, AuthController.getSession);
router.post('/logout', AuthController.logout);

export default router;
