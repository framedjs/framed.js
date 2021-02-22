import { Client } from "../structures/Client";
import { BaseMessage } from "../structures/BaseMessage";
import { DiscordMessageDataOptions } from "./DiscordMessageDataOptions";
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
	base?: MessageOptions | BaseMessage;

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
	discord?: DiscordMessageDataOptions;

	/**
	 * Twitch data.
	 */
	twitch?: TwitchMessageOptions;
}
