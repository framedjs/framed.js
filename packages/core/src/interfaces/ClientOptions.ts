import { APIManager } from "../managers/APIManager";
import { CommandManager } from "../managers/CommandManager";
import { FormattingManager } from "../managers/FormattingManager";
import { PluginManager } from "../managers/PluginManager";
import { BaseProvider } from "../providers/BaseProvider";

/**
 * Used with initializing Framed client.
 */
export interface ClientOptions {
	/**
	 * A version number, separate from the Framed framework itself.
	 */
	appVersion?: string;

	/**
	 * The prefix used for all commands, except when a plugin or commands explicitly uses something else.
	 */
	defaultPrefix?: string;

	/**
	 * API Manager
	 */
	apiManager?: APIManager;

	/**
	 * Command Manager
	 */
	commandManager?: CommandManager;

	/**
	 * Formatting Manager
	 */
	formattingManager?: FormattingManager;

	/**
	 * Place Manager
	 */
	// placeManager?: PlaceManager;

	/**
	 * Plugin Manager
	 */
	pluginManager?: PluginManager;

	/**
	 * Provider
	 */
	provider?: BaseProvider;

	//#region Platform-specific data

	/**
	 * Discord options
	 */
	discord?: DiscordClientOptions;

	/**
	 * Twitch options
	 */
	twitch?: TwitchClientOptions;

	// Technically a Discord-specific thing, but didn't bother to move it in fear of things going wrong
	/**
	 * Help command list
	 */
	footer?: string | string[];

	//#endregion
}

export interface DiscordClientOptions {
	/**
	 * The prefix used for all commands, except when a plugin or commands explicitly uses something else.
	 *
	 * This prefix is by default applied to when the platform is Discord.
	 */
	defaultPrefix?: string;

	/**
	 * The bot owners, represented as user IDs.
	 */
	botOwners?: string[] | string;
}

export interface TwitchClientOptions {
	/**
	 * The prefix used for all commands, except when a plugin or commands explicitly uses something else.
	 *
	 * This prefix is by default applied to when the platform is Twitch.
	 */
	defaultPrefix?: string;

	/**
	 * The owner(s), represented as a username or user IDs.
	 * @todo Currently placeholder, variable doesn't do anything currently
	 */
	botOwners?: string[] | string;
}
