import Discord from "discord.js";

export interface DiscordMessageData {
	/**
	 * The Discord message object.
	 */
	readonly msg?: Discord.Message;

	/**
	 * The Discord client object.
	 */
	readonly client: Discord.Client;

	/**
	 * The Discord message ID.
	 */
	readonly id?: string;

	/**
	 * The channel the message was sent through.
	 */
	readonly channel:
		| Discord.TextChannel
		| Discord.DMChannel
		| Discord.NewsChannel;

	/**
	 * The author of the message.
	 */
	readonly author: Discord.User;

	/**
	 * The member of a guild.
	 */
	readonly member?: Discord.GuildMember | null;

	/**
	 * The guild of where the Discord message came from.
	 */
	readonly guild: Discord.Guild | null;
}
