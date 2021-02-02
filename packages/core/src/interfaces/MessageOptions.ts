import { Client } from "../structures/Client";
import { Message } from "../structures/Message";
import { DiscordMessageOptions } from "./DiscordMessageOptions";
import { TwitchMessageOptions } from "./TwitchMessageOptions";

export interface MessageOptions {
	/**
	 * Framed Client
	 */
	client: Client;

	/**
	 * The object the message data will be based off of.
	 *
	 * The base itself shouldnt be modified, but the rest of the Discord data
	 * should be changed to fake a command, and override the base.
	 */
	base?: MessageOptions | Message;

	/**
	 * The content of the message. If a specific platform's content parameter
	 * doesn't exist, it will use this universal one instead.
	 */
	content?: string;

	/**
	 * Discord data.
	 * 
	 * If no base is specified, client, channel and author is required.
	 */
	discord?: DiscordMessageOptions;

	/**
	 * Twitch data.
	 */
	twitch?: TwitchMessageOptions;
}
