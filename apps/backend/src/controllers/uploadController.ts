
import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
console.log('=== SUPABASE STORAGE INITIALIZATION ===');
console.log('SUPABASE_URL present:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY present:', !!process.env.SUPABASE_ANON_KEY);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 20) + '...' : 'not set');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

console.log('Supabase client initialized');
console.log('=== END SUPABASE STORAGE INITIALIZATION ===');

export class UploadController {
  static async uploadFile(req: Request & { file?: Express.Multer.File }, res: Response): Promise<void> {
    console.log('=== FILE UPLOAD DEBUG ===');
    try {
      if (!req.file) {
        console.log('No file uploaded');
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const file = req.file;
      console.log('File received:', file.originalname);
      console.log('File size:', file.size);
      console.log('File mimetype:', file.mimetype);
      console.log('Buffer length:', file.buffer.length);
      
      // Generate unique filename
      const filename = `${Date.now()}-${file.originalname}`;
      const filePath = `uploads/${filename}`;
      console.log('Generated file path:', filePath);

      // Upload to Supabase Storage
      console.log('Starting Supabase upload to bucket: attachments');
      const { error } = await supabase.storage
        .from('attachments')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('Supabase upload error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        res.status(500).json({ error: error.message || 'Failed to upload file' });
        return;
      }

      console.log('Supabase upload successful');

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath);

      console.log('Public URL generated:', publicUrl);
      console.log('Upload complete, sending response');
      console.log('=== END FILE UPLOAD DEBUG ===');

      res.json({
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        path: filePath,
        url: publicUrl,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      console.error('Error stack:', error.stack);
      console.log('=== END FILE UPLOAD DEBUG ===');
      res.status(500).json({ error: error.message || 'Failed to upload file' });
    }
  }
}
