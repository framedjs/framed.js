import type Discord from "discord.js";

export interface DiscordChatInputInteractionData {
	readonly type: "data";

	/**
	 * The Discord interaction object.
	 */
	readonly interaction: Discord.ChatInputCommandInteraction;

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
	 */
	// readonly member?: Discord.GuildMember | Discord.APIInteractionGuildMember | null;

	/**
	 * The guild of where the Discord message came from.
	 */
	readonly guild: Discord.Guild | null;
}
