import Discord from "discord.js";

export default interface ResponseData {
	content: string;
	command?: string;
	responseId?: string;
	discord?: {
		channelsToSendTo?: string[];
		embeds?: Discord.MessageEmbed[];
	};
}
