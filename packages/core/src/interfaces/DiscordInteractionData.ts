import type Discord from "discord.js";

export interface DiscordInteractionData {
	readonly type: "data";

	/**
	 * The Discord interaction object.
	 */
	readonly interaction: Discord.Interaction;

	/**
	 * The Discord client object.
	 */
	readonly client: Discord.Client;

	/**
	 * The channel the message was sent through.
	 */
	readonly channel: Discord.TextBasedChannel;

	/**
	 * The author of the message.
	 */
	readonly user: Discord.User;

	/**
	 * The member of a guild.
	 *
	 * Note that if the member was an APIInteractionGuildMember, this will be null.
	 */
	readonly member?: Discord.GuildMember | null;

	/**
	 * The guild of where the Discord message came from.
	 */
	readonly guild: Discord.Guild | null;
}
