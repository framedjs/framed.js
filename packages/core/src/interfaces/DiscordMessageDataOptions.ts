import type Discord from "discord.js";

export interface DiscordMessageDataOptions {
	/**
	 * The object the message data will be based off of.
	 *
	 * The base itself shouldn't be modified, but the rest of the Discord data
	 * should be changed to fake a command, and override the base.
	 */
	base?: Discord.Message;

	/**
	 * The Discord client object.
	 */
	client?: Discord.Client;

	/**
	 * The Discord message ID.
	 */
	id?: string;

	/**
	 * The channel the message was sent through.
	 */
	channel?: Discord.TextBasedChannel;

	/**
	 * The author of the message.
	 */
	author?: Discord.User;

	/**
	 * The member of a guild.
	 */
	member?: Discord.GuildMember;

	/**
	 * The guild of where the Discord message came from.
	 */
	guild?: Discord.Guild | null;
}
