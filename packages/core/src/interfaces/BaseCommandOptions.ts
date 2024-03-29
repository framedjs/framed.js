import type { BasePluginObjectOptions } from "./BasePluginObjectOptions";
import type { CooldownOptions } from "./CooldownOptions";
import type { InlineOptions } from "./InlineOptions";
import type { Prefixes } from "./Prefixes";
import type { UniversalSlashCommandBuilder } from "../types/UniversalSlashCommandBuilder";

/**
 * To be used with BaseCommand and BaseSubcommand
 */
export interface BaseCommandOptions extends BasePluginObjectOptions {
	/**
	 * The ID of the command, which cannot use spaces. All plugin IDs should try to be unique,
	 * to make sure that no plugin from different developers would overlap.
	 *
	 * Commands will use the ID to be able to be triggered.
	 *
	 * For example, if the ID was "test", then one way to be able to trigger it would
	 * be !test if the default prefix was "!".
	 *
	 * If the command info is part of a subcommand, the subcommand is the ID.
	 */
	id: string;

	/**
	 * The command tries to import scripts from paths found in this object.
	 */
	paths?: {
		subcommands?: string;
	};

	/** Stores a list of command aliases possible to trigger the command. */
	aliases?: string[];

	/** Optional prefix override from the client. */
	defaultPrefix?: Prefixes | string;

	/** A list of all possible prefixes. */
	prefixes?: string[];

	/** Group */
	group?: string;

	/** A brief, one-liner about section to talk about what the command does. */
	about?: string;

	/** A description of what the command does. This is encouraged to span multiple lines */
	description?: string;

	/** Info on how to use the command. */
	usage?: string;

	/** Should this command hide its usage instructions on the help embed? */
	hideUsageInHelp?: boolean;

	/** Examples on how to use the command. */
	examples?: string;

	/** Cooldown behavior */
	cooldown?: CooldownOptions;

	/** Extra notes about the command, that isn't in the description. */
	notes?: string;

	/** The embed inline character limit, before it becomes not inline in the help embed. */
	inlineCharacterLimit?: number;

	/** Use inline for embed field? */
	inline?: boolean | InlineOptions;

	/** Use inline for embed for aliases field? */
	inlineAliases?: boolean;

	/** Discord slash command options */
	discordInteraction?: {
		/**
		 * Should this slash command be a global command?
		 * @default true
		 */
		global?: boolean;

		/** Discord slash command options. */
		slashCommandBuilder?: UniversalSlashCommandBuilder;
	};
}
