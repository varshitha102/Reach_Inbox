import { Request, Response } from 'express';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client for Railway Storage
const s3 = new S3Client({
  region: 'us-east-1',
  endpoint: process.env.ENDPOINT,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID || '',
    secretAccessKey: process.env.SECRET_ACCESS_KEY || '',
  },
});

export class UploadController {
  static async getUploadUrl(req: Request, res: Response): Promise<void> {
    try {
      const { filename } = req.body;
      
      if (!filename) {
        res.status(400).json({ error: 'Filename is required' });
        return;
      }

      // Generate unique key for the file
      const key = `uploads/${Date.now()}-${filename}`;

      // Create presigned PUT URL
      const command = new PutObjectCommand({
        Bucket: process.env.RAILWAY_BUCKET_NAME,
        Key: key,
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

      res.json({
        uploadUrl,
        key,
      });
    } catch (error: any) {
      console.error('Upload URL generation error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate upload URL' });
    }
  }

  static async getDownloadUrl(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;

      if (!key) {
        res.status(400).json({ error: 'Key is required' });
        return;
      }

      // Create presigned GET URL
      const command = new GetObjectCommand({
        Bucket: process.env.RAILWAY_BUCKET_NAME,
        Key: key,
      });

      const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

      res.json({ downloadUrl });
    } catch (error: any) {
      console.error('Download URL generation error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate download URL' });
    }
  }

  static async uploadFile(req: Request & { file?: Express.Multer.File }, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const file = req.file;
      
      // Generate unique key for the file
      const key = `uploads/${Date.now()}-${file.originalname}`;

      // Upload to Railway Storage
      const command = new PutObjectCommand({
        Bucket: process.env.RAILWAY_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await s3.send(command);

      // Generate download URL
      const getCommand = new GetObjectCommand({
        Bucket: process.env.RAILWAY_BUCKET_NAME,
        Key: key,
      });

      const downloadUrl = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });

      res.json({
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        key,
        downloadUrl,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error.message || 'Failed to upload file' });
    }
  }
}
