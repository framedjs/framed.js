import Discord from "discord.js";

export interface BaseEventDiscordOptions {
	/** Discord Client */
	client?: Discord.Client;

	/** Discord client event */
	name: keyof Discord.ClientEvents;
}
