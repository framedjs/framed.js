import type { Client } from "../structures/Client";
import type { BaseMessage } from "../structures/BaseMessage";
import type { DiscordMessageDataOptions } from "./DiscordMessageDataOptions";
import type { TwitchMessageOptions } from "./TwitchMessageOptions";
import type { DiscordInteractionDataOptions } from "./DiscordInteractionDataOptions";
import type Discord from "discord.js";

export interface MessageOptions {
	/**
	 * Framed Client
	 */
	client: Client;

	/**
	 * The object the message data will be based off of.
	 *
	 * The base itself shouldn't be modified, but the rest of the Discord data
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
	discord?: DiscordMessageDataOptions | Discord.Message;

	/**
	 * Discord interaction, or Discord interaction data.
	 */
	discordInteraction?: DiscordInteractionDataOptions | Discord.Interaction;

	/**
	 * Twitch data.
	 */
	twitch?: TwitchMessageOptions;
}
