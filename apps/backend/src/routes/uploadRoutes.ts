import { Router } from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/uploadController.js';

const router = Router();

// Configure multer for memory storage (for Railway Storage upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Generate presigned upload URL (client uploads directly to Railway Storage)
router.post('/upload-url', UploadController.getUploadUrl);

// Generate presigned download URL
router.get('/download-url/:key', UploadController.getDownloadUrl);

// Upload file via backend (for compatibility with existing frontend)
router.post('/upload', upload.single('file'), UploadController.uploadFile);

export default router;
