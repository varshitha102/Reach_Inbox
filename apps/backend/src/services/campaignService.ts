import { CampaignRepository, CreateCampaignInput } from '../repositories/campaignRepository.js';
import { CreateCampaignInput as CreateCampaignValidationInput, UpdateCampaignInput } from '../validation/campaignValidation.js';

export class CampaignService {
  static async createCampaign(userId: string, data: CreateCampaignValidationInput) {
    const input: CreateCampaignInput = {
      userId,
      senderId: data.senderId,
      name: data.name,
      subject: data.subject,
    };

    return CampaignRepository.create(input);
  }

  static async getCampaigns(userId: string, status?: string) {
    return CampaignRepository.findByUserId(userId, status as any);
  }

  static async getCampaign(id: string) {
    return CampaignRepository.findById(id);
  }

  static async updateCampaign(id: string, data: UpdateCampaignInput) {
    if (data.status) {
      return CampaignRepository.updateStatus(id, data.status);
    }
    
    // For other updates, we'd need to extend the repository
    return CampaignRepository.findById(id);
  }

  static async deleteCampaign(id: string) {
    return CampaignRepository.delete(id);
  }
}
