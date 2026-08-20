import { Request, Response } from 'express';
import { CampaignService } from '../services/campaignService.js';
import { createCampaignSchema, updateCampaignSchema } from '../validation/campaignValidation.js';

export class CampaignController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const data = createCampaignSchema.parse(req.body);
      const campaign = await CampaignService.createCampaign(req.user!.id, data);
      res.status(201).json(campaign);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: error.errors });
        return;
      }
      res.status(500).json({ error: error.message });
    }
  }

  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.query;
      const campaigns = await CampaignService.getCampaigns(req.user!.id, status as string);
      res.json(campaigns);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const campaign = await CampaignService.getCampaign(id);
      
      if (!campaign) {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }

      res.json(campaign);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateCampaignSchema.parse(req.body);
      const campaign = await CampaignService.updateCampaign(id, data);
      res.json(campaign);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        res.status(400).json({ error: error.errors });
        return;
      }
      res.status(500).json({ error: error.message });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await CampaignService.deleteCampaign(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
