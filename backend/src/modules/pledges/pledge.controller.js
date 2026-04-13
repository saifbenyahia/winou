import pool from "../../config/db.js";
import * as CampaignModel from "../campaigns/campaign.model.js";
import * as AuthModel from "../auth/auth.model.js";
import { sendNewSupportNotification } from "../notifications/notification.service.js";
import { parseTndToMillimes } from "../../shared/utils/money.js";
import * as PledgeModel from "./pledge.model.js";

const resolveAmountMillimes = (body = {}) => {
  if (body.amount_millimes !== undefined || body.amountMillimes !== undefined) {
    const rawAmount = body.amount_millimes ?? body.amountMillimes;
    const parsedAmount = Number.parseInt(String(rawAmount), 10);

    if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) {
      throw new Error("Le montant doit etre superieur a 0.");
    }

    return parsedAmount;
  }

  return parseTndToMillimes(body.amount_tnd ?? body.amountTnd ?? body.amount);
};

export const createPledge = async (req, res) => {
  const targetCampaignId = req.body?.campaign_id ?? req.body?.campaignId ?? null;

  if (!targetCampaignId) {
    return res.status(400).json({
      success: false,
      message: "La campagne a soutenir est obligatoire.",
    });
  }

  let amountMillimes;
  try {
    amountMillimes = resolveAmountMillimes(req.body);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Le montant de soutien est invalide.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const campaignQuery = await client.query(
      `SELECT id, porteur_id, title, status
       FROM campaigns
       WHERE id = $1
       FOR UPDATE`,
      [targetCampaignId]
    );

    const lockedCampaign = campaignQuery.rows[0];

    if (!lockedCampaign) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Campagne introuvable.",
      });
    }

    if (lockedCampaign.status !== "ACTIVE") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Seules les campagnes actives peuvent recevoir des soutiens.",
      });
    }

    if (lockedCampaign.porteur_id === req.user.id) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Vous ne pouvez pas soutenir votre propre campagne.",
      });
    }

    const pledge = await PledgeModel.createPledge(
      {
        campaignId: lockedCampaign.id,
        donorId: req.user.id,
        amount: amountMillimes,
        status: "SUCCESS",
      },
      client
    );

    await client.query(
      `UPDATE campaigns
       SET current_amount = current_amount + $1
       WHERE id = $2`,
      [amountMillimes, lockedCampaign.id]
    );

    await client.query("COMMIT");

    const [campaign, donor] = await Promise.all([
      CampaignModel.findById(lockedCampaign.id),
      AuthModel.findById(req.user.id),
    ]);

    if (campaign && donor) {
      await sendNewSupportNotification({
        campaign,
        donor,
        amount: amountMillimes,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Votre soutien a bien ete enregistre.",
      pledge,
      campaign,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create pledge error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  } finally {
    client.release();
  }
};

export const getMySupportedCampaigns = async (req, res) => {
  try {
    const campaigns = await PledgeModel.findSupportedCampaignsByDonor(req.user.id);

    return res.status(200).json({
      success: true,
      campaigns,
    });
  } catch (error) {
    console.error("Get supported campaigns error:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
    });
  }
};
