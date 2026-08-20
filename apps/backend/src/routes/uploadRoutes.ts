import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/uploadController.js';

const router = Router();

// Configure multer for memory storage (for Supabase upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Upload file via backend to Supabase
router.post('/upload', upload.single('file'), UploadController.uploadFile);

export default router;
