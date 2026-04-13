import * as SavedModel from "./saved.model.js";

export const listSavedCampaigns = async (userId) => SavedModel.getByUser(userId);

export const saveCampaign = async (userId, campaignId) => SavedModel.save(userId, campaignId);

export const unsaveCampaign = async (userId, campaignId) => SavedModel.unsave(userId, campaignId);

export const checkSavedCampaign = async (userId, campaignId) => SavedModel.isSaved(userId, campaignId);
