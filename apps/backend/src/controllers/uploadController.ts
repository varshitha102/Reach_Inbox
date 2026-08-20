
import { Request, Response } from 'express';
import { getSupabaseClient } from '../services/supabaseService.js';

export class UploadController {
  static async uploadFile(req: Request & { file?: Express.Multer.File }, res: Response): Promise<void> {
    console.log('=== FILE UPLOAD DEBUG ===');
    try {
      const supabase = getSupabaseClient();
      
      if (!supabase) {
        console.error('Supabase client not initialized');
        res.status(500).json({ error: 'Supabase client not initialized' });
        return;
      }

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
