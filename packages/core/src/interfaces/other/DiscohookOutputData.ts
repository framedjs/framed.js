import Discord from "discord.js";

export interface DiscohookOutputData {
	content: string | null;
	embeds: Discord.MessageEmbedOptions[];
	username?: string;
	avatar_url?: string;
}
