import { Router, Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { UploadController } from '../controllers/uploadController.js';

const router = Router();

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: async (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Upload a single file
router.post('/upload', upload.single('file'), UploadController.uploadFile);

// Get uploaded file
router.get('/file/:filename', UploadController.getFile);

export default router;
