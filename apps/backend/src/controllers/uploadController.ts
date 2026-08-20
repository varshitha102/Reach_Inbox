import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';

export class UploadController {
  static async uploadFile(req: Request & { file?: Express.Multer.File }, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const file = req.file;
      
      // Return file info with full URL
      const fileUrl = `http://localhost:3001/uploads/${file.filename}`;
      
      res.json({
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        url: fileUrl,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error.message || 'Failed to upload file' });
    }
  }

  static async getFile(req: Request, res: Response): Promise<void> {
    try {
      const filename = req.params.filename;
      const filePath = path.join(process.cwd(), 'uploads', filename);
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        res.status(404).json({ error: 'File not found' });
        return;
      }
      
      res.sendFile(filePath);
    } catch (error: any) {
      console.error('Get file error:', error);
      res.status(500).json({ error: error.message || 'Failed to get file' });
    }
  }
}
