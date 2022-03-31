import Discord from "discord.js";
import type { BaseDiscordMenuFlowPageRenderOptions } from "./BaseDiscordMenuFlowPageRenderOptions";

export interface BaseDiscordMenuFlowMsgPageOptions
	extends BaseDiscordMenuFlowPageRenderOptions {
	message: Discord.Message;
	usedMessageHistory: boolean;
}
