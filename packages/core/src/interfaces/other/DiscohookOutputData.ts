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
	embeds: Discord.EmbedData[];
	username?: string;
	avatar_url?: string;
}
