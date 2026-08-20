import { Request, Response } from 'express';
import { EmailJobService } from '../services/emailJobService.js';
import { createEmailJobSchema, bulkCreateEmailJobsSchema, searchEmailJobsSchema } from '../validation/emailJobValidation.js';

export class EmailJobController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const data = createEmailJobSchema.parse(req.body);
      const emailJob = await EmailJobService.createEmailJob(req.user!.id, data);
      res.status(201).json(emailJob);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: error.errors });
        return;
      }
      res.status(500).json({ error: error.message });
    }
  }

  static async bulkCreate(req: Request, res: Response): Promise<void> {
    try {
      console.log('RAW scheduledAt received:', req.body?.scheduledAt);
      console.log('RAW body:', JSON.stringify(req.body, null, 2));
      
      const data = bulkCreateEmailJobsSchema.parse(req.body);
      const emailJobs = await EmailJobService.bulkCreateEmailJobs(req.user!.id, data);
      res.status(201).json(emailJobs);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        console.error('Validation error:', error.errors);
        res.status(400).json({ error: error.errors });
        return;
      }
      console.error('Bulk create error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const emailJob = await EmailJobService.getEmailJob(id, req.user!.id);
      
      if (!emailJob) {
        res.status(404).json({ error: 'Email job not found' });
        return;
      }

      res.json(emailJob);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { status, page = '1', limit = '50' } = req.query;
      const result = await EmailJobService.getUserEmailJobs(
        req.user!.id,
        status as string,
        parseInt(page as string),
        parseInt(limit as string)
      );
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async cancel(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const emailJob = await EmailJobService.cancelEmailJob(id, req.user!.id);
      res.json(emailJob);
    } catch (error: any) {
      if (error.message === 'Email job not found') {
        res.status(404).json({ error: error.message });
        return;
      }
      if (error.message === 'Cannot cancel sent email') {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: error.message });
    }
  }

  static async search(req: Request, res: Response): Promise<void> {
    try {
      const data = searchEmailJobsSchema.parse(req.body);
      const { page = '1', limit = '50' } = req.query;
      const result = await EmailJobService.searchEmailJobs(
        req.user!.id,
        data.query,
        parseInt(page as string),
        parseInt(limit as string)
      );
      res.json(result);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: error.errors });
        return;
      }
      res.status(500).json({ error: error.message });
    }
  }

  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await EmailJobService.getEmailJobStats(req.user!.id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteByCampaign(req: Request, res: Response): Promise<void> {
    try {
      const { campaignId } = req.params;
      const result = await EmailJobService.deleteByCampaign(req.user!.id, campaignId);
      res.json({ deleted: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async listCampaigns(req: Request, res: Response): Promise<void> {
    try {
      const campaigns = await EmailJobService.listCampaigns(req.user!.id, req.query.status as string);
      res.json(campaigns);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async deleteAllScheduled(req: Request, res: Response): Promise<void> {
    try {
      const result = await EmailJobService.deleteAllScheduled(req.user!.id);
      res.json({ deleted: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
