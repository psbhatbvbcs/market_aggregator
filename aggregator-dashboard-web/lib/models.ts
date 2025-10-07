import mongoose from "mongoose";

// User Activity Schema
const userActivitySchema = new mongoose.Schema({
  discord_id: String,
  telegram_id: String,
  telegramUsername: String,
  command_name: String,
  timestamp: Date,
  guild_id: String,
  channel_id: String,
  chat_id: String,
});

// Bet Schema
const betSchema = new mongoose.Schema({
  discordId: String,
  telegramId: String,
  amountUsd: Number,
  platformFeeAmount: Number,
  timestamp: Date,
  guildId: String,
  channelId: String,
  betSource: String,
  marketId: String,
  position: String,
  status: String,
});

// Server Schema
const serverSchema = new mongoose.Schema({
  guildId: String,
  guildName: String,
  memberCount: Number,
  createdAt: Date,
});

export const UserActivity = mongoose.models.UserActivity || mongoose.model("UserActivity", userActivitySchema);
export const Bet = mongoose.models.Bet || mongoose.model("Bet", betSchema);
export const Server = mongoose.models.Server || mongoose.model("Server", serverSchema); 