import Discord from "discord.js";
import FramedClient from "../structures/FramedClient";

export interface FramedMessageInfo {
	framedClient: FramedClient;

	/**
	 * Discord data
	 */
	discord?: {
		/**
		 * The Discord message that the Framed message is based off of.
		 *
		 * If this value is defined, this will override all other parameters,
		 * including `client`, `channel`, `content`, etc.
		 */
		msg?: Discord.Message;

		/**
		 * The Discord client.
		 *
		 * If msg is defined, you do not need to set this variable to anything,
		 * as it'll be overridden by `msg`. If not, then this value is required.
		 */
		client?: Discord.Client;

		/**
		 * The Discord message ID, if valid.
		 *
		 * If msg is defined, you do not need to set this variable to anything,
		 * as it'll be overridden by `msg`. Unlike most values in FramedMessageInfo,
		 * this value isn't requried if `msg` isn't set.
		 */
		id?: string;

		/**
		 * The channel the message was sent through. 
		 * 
		 * If this message was created not through a Discord user, but by scripts, 
		 * this is the channel that the virtual message would've been sent through. 
		 *
		 * If msg is defined, you do not need to set this variable to anything,
		 * as it'll be overridden by `msg`. If not, then this value is required.
		 */
		channel?: Discord.TextChannel | Discord.DMChannel | Discord.NewsChannel;

		/**
		 * The content of the Discord message.
		 *
		 * If msg is defined, you do not need to set this variable to anything,
		 * as it'll be overridden by `msg`. If not, then this value is required.
		 */
		content?: string;

		/**
		 * The author of the message.
		 *
		 * If msg is defined, you do not need to set this variable to anything,
		 * as it'll be overridden by `msg`. If not, then this value is required.
		 */
		author?: Discord.User;

		/**
		 * The guild of where the Discord message came from.
		 *
		 * This parameter is optional, regardless of if `msg` was set.
		 */
		guild?: Discord.Guild | null;
	};
}
