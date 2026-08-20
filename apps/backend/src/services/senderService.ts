import { SenderRepository } from '../repositories/senderRepository.js';
import { CreateSenderInput, UpdateSenderInput } from '../validation/senderValidation.js';

export class SenderService {
  static async createSender(userId: string, data: CreateSenderInput) {
    // Check if sender already exists
    const existing = await SenderRepository.findByEmail(userId, data.email);
    if (existing) {
      throw new Error('Sender with this email already exists');
    }

    return SenderRepository.create(userId, data.email, data.name);
  }

  static async getSenders(userId: string) {
    return SenderRepository.findByUserId(userId);
  }

  static async getSender(id: string) {
    return SenderRepository.findById(id);
  }

  static async updateSender(id: string, data: UpdateSenderInput) {
    if (data.status) {
      return SenderRepository.updateStatus(id, data.status);
    }
    
    // For other updates, we'd need to extend the repository
    return SenderRepository.findById(id);
  }

  static async deleteSender(id: string) {
    return SenderRepository.delete(id);
  }
}
