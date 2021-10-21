import type Discord from "discord.js";

export interface DiscohookOutputData {
	messages: [
		{
			data: DiscohookMessageData;
		}
	];
}

export interface DiscohookMessageData {
	content: string | null;
	embeds: Discord.MessageEmbedOptions[];
	username?: string;
	avatar_url?: string;
}
