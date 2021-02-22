import Discord from "discord.js";

export interface DiscohookOutputData {
	messages: [
		{
			data: {
				content: string | null;
				embeds: Discord.MessageEmbedOptions[];
				username?: string;
				avatar_url?: string;
			};
		}
	];
}
