import Discord from "discord.js";

export interface ResponseData {
	content?: string;
	command?: string;
	responseId?: string;
	discord?: {
		channelsToSendTo?: string[];
		embeds?: Discord.MessageEmbedOptions[];
	};
}
