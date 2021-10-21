import { BasePlugin } from "./BasePlugin";
import { Client } from "./Client";
import type Discord from "discord.js";
import type { InlineOptions } from "../interfaces/InlineOptions";
import type { BotPermissions } from "../interfaces/BotPermissions";
import type { UserPermissions } from "../interfaces/UserPermissions";

export interface BaseDiscordInteractionOptions {
	/** The ID of the interaction, or otherwise known as "commandName". */
	id: string;

	/** The command tries to import scripts from paths found in this object. */
	paths?: {
		subcommands?: string;
	};

	/** A brief description of what the command does. */
	description?: string;

	/**
	 * The usage key on how to use the command.
	 * Barely anyone reads these for longer commands,
	 * so make sure you have examples.
	 */
	usage?: string;

	/** Should this command hide its usage instructions on the help embed? */
	hideUsageInHelp?: boolean;

	/** Examples on how to use the command. */
	examples?: string;

	/** Extra notes about the command, that isn't in the description. */
	notes?: string;

	/** Bot permissions needed to run the command. */
	botPermissions?: BotPermissions;

	/** User permissions needed to run the command. */
	userPermissions?: UserPermissions;

	/**
	 * Inline options for help embeds. There are individual settings for each element (ex. examples, usage).
	 * However, you can set this as a boolean to make all fields be either inline or not.
	 */
	inline?: boolean | InlineOptions;
}

export abstract class BaseDiscordInteraction
	implements BaseDiscordInteractionOptions
{
	readonly client: Client;

	//#region Duplication of interface

	/** The ID of the interaction, or otherwise known as "commandName". */
	id: string;

	/** The command tries to import scripts from paths found in this object. */
	paths?: {
		subcommands?: string;
	};

	/** A brief description of what the command does. */
	description?: string;

	/**
	 * The usage key on how to use the command.
	 * Barely anyone reads these for longer commands,
	 * so make sure you have examples.
	 */
	usage?: string;

	/** Should this command hide its usage instructions on the help embed? */
	hideUsageInHelp?: boolean;

	/** Examples on how to use the command. */
	examples?: string;

	/** Extra notes about the command, that isn't in the description. */
	notes?: string;

	/** Bot permissions needed to run the command. */
	botPermissions?: BotPermissions;

	/** User permissions needed to run the command. */
	userPermissions?: UserPermissions;

	/**
	 * Inline options for help embeds. There are individual settings for each element (ex. examples, usage).
	 * However, you can set this as a boolean to make all fields be either inline or not.
	 */
	inline?: boolean | InlineOptions;

	//#endregion

	fullId: string;

	/** The plugin this command is attached to. */
	plugin: BasePlugin;

	/** Subcommands; key is a subcommand ID */
	// subcommands: Map<string, BaseSubcommand>;

	/** Contains the raw info of how this command was initialized. */
	rawInfo: BaseDiscordInteractionOptions;

	constructor(plugin: BasePlugin, info: BaseDiscordInteractionOptions) {
		this.client = plugin.client;
		this.plugin = plugin;

		this.id = info.id.toLocaleLowerCase();
		this.paths = info.paths;
		this.fullId = `${this.plugin.id}.interaction.${this.id}`;

		this.description = info.description;
		this.usage = info.usage;
		this.examples = info.examples;
		this.notes = info.notes;
		this.botPermissions = info.botPermissions;
		this.userPermissions = info.userPermissions;
		this.hideUsageInHelp = info.hideUsageInHelp;

		this.rawInfo = info;
	}

	abstract run(interaction: Discord.Interaction): Promise<boolean>;
}
