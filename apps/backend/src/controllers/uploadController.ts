
import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

export class UploadController {
  static async uploadFile(req: Request & { file?: Express.Multer.File }, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const file = req.file;
      
      // Generate unique filename
      const filename = `${Date.now()}-${file.originalname}`;
      const filePath = `uploads/${filename}`;

      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from('attachments')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        res.status(500).json({ error: error.message || 'Failed to upload file' });
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      res.json({
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        path: filePath,
        url: publicUrl,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error.message || 'Failed to upload file' });
    }
  }
}
