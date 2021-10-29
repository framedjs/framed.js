import type Discord from "discord.js";

export interface DiscordInteractionDataOptions {
	readonly type: 'dataOptions';

	/**
	 * The object the interaction data will be based off of.
	 * 
	 * The base itself shouldn't be modified, but the rest of the Discord data
	 * should be changed to fake a command, and override the base.
	 */
	base?: Discord.Interaction;

	/**
	 * The Discord client object.
	 */
	client?: Discord.Client;

	/**
	 * The channel the message was sent through.
	 */
	channel?: Discord.TextBasedChannels;

	/**
	 * The author of the message.
	 */
	user?: Discord.User;

	/**
	 * The member of a guild.
	 */
	member?: Discord.GuildMember;

	/**
	 * The guild of where the Discord message came from.
	 */
	guild?: Discord.Guild | null;
}
