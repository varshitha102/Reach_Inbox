import { Request, Response } from 'express';
import { SenderService } from '../services/senderService.js';
import { createSenderSchema, updateSenderSchema } from '../validation/senderValidation.js';

export class SenderController {
  static async getDefaultSender(_req: Request, res: Response): Promise<void> {
    try {
      const defaultSender = {
        email: process.env.SMTP_FROM || '',
        name: process.env.DEFAULT_SENDER_NAME || 'Default Sender',
      };
      res.json(defaultSender);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const data = createSenderSchema.parse(req.body);
      const sender = await SenderService.createSender(req.user!.id, data);
      res.status(201).json(sender);
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
      const senders = await SenderService.getSenders(req.user!.id);
      res.json(senders);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const sender = await SenderService.getSender(id);
      
      if (!sender) {
        res.status(404).json({ error: 'Sender not found' });
        return;
      }

      res.json(sender);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = updateSenderSchema.parse(req.body);
      const sender = await SenderService.updateSender(id, data);
      res.json(sender);
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
      await SenderService.deleteSender(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
