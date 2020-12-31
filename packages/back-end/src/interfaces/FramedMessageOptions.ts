import FramedClient from "../structures/FramedClient";
import FramedMessage from "../structures/FramedMessage";
import { FramedDiscordMessageOptions } from "./FramedDiscordMessageOptions";

export interface FramedMessageOptions {
	/**
	 * Framed Client
	 */
	framedClient: FramedClient;

	/**
	 * The object the message data will be based off of.
	 *
	 * The base itself shouldnt be modified, but the rest of the Discord data
	 * should be changed to fake a command, and override the base.
	 */
	base?: FramedMessageOptions | FramedMessage;

	/**
	 * The content of the message. If a specific platform's content parameter
	 * doesn't exist, it will use this universal one instead.
	 */
	content?: string;

	/**
	 * Discord data.
	 */
	discord?: FramedDiscordMessageOptions;
}
