import Discord from "discord.js";
import FramedClient from "../structures/FramedClient";
import FramedMessage from "../structures/FramedMessage";

export interface FramedMessageInfo {
	framedClient: FramedClient;

	/**
	 * The content of the message. If a specific platform's content parameter
	 * doesn't exist, it will use this universal one instead.
	 */
	content?: string;

	/**
	 * Discord data.
	 */
	discord?: {
		/**
		 * The object the message data will be based off of.
		 *
		 * The base itself shouldnt be modified, but the rest of the Discord data
		 * should be changed to fake a command, and override the base.
		 */
		base?: Discord.Message | FramedMessageInfo | FramedMessage;

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
		channel?: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel;

		/**
		 * The content of the Discord message.
		 */
		// content?: string;

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
	};
}
