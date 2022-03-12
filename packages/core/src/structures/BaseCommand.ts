/* eslint-disable no-mixed-spaces-and-tabs */
import { BaseMessage } from "./BaseMessage";
import { BasePluginObject } from "./BasePluginObject";
import { BasePlugin } from "./BasePlugin";
import { BaseSubcommand } from "./BaseSubcommand";
import Discord from "discord.js";
import { Utils } from "@framedjs/shared";
import { Logger } from "@framedjs/logger";
import { oneLine, stripIndents } from "common-tags";

import type { BaseCommandOptions } from "../interfaces/BaseCommandOptions";
import type { CooldownOptions } from "../interfaces/CooldownOptions";
import type { CooldownData } from "../interfaces/CooldownData";
import type { InlineOptions } from "../interfaces/InlineOptions";
import type { Place } from "../interfaces/Place";
import type { Prefixes } from "../interfaces/Prefixes";
import type { RequireAllOptions } from "@framedjs/shared";
import type { UniversalSlashCommandBuilder } from "../types/UniversalSlashCommandBuilder";

export abstract class BaseCommand extends BasePluginObject {
	// static readonly type: string = "BaseCommand";

	/**
	 * The ID of the command, which cannot use spaces. All plugin IDs should try to be unique,
	 * to make sure that no plugin from different developers would overlap.
	 *
	 * Commands will use the ID to be able to be triggered.
	 *
	 * For example, if the ID was "test", then one way to be able to trigger it would
	 * be !test if the default prefix was "!".
	 */
	id!: string;

	/** Indicates what kind of plugin object this is. */
	type: "command" | "subcommand" | "interaction" = "command";

	/** Stores an ID for the command that should be completely unique between plugins. */
	fullId: string;

	/** The plugin this command is attached to. */
	plugin: BasePlugin;

	/** The command tries to import scripts from paths found in this object. */
	paths?: {
		subcommands?: string;
	};

	/** Subcommands; key is a subcommand ID */
	subcommands: Map<string, BaseSubcommand>;

	/**  Subcommands aliases; key is a subcommand alias string */
	subcommandAliases: Map<string, BaseSubcommand>;

	/** Stores a list of command aliases possible to trigger the command. */
	aliases?: string[];

	/** The default prefix of the command.*/
	defaultPrefix: Prefixes;

	/** Has defaultPrefix been explicitly set by the script, or were the values gained implicitly? */
	private defaultPrefixExplicitlySet = false;

	/** The group name this command is in. */
	group: string;

	/** Group emote. */
	groupEmote?: string;

	/** A brief, one-liner about section to talk about what the command does. */
	about?: string;

	/** A description of what the command does. This is encouraged to span multiple sentences. */
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

	/** Cooldown options. */
	cooldown?: CooldownOptions;

	/** Extra notes about the command, that isn't in the description. */
	notes?: string;

	/**
	 * Inline options for help embeds. There are individual settings for each element (ex. examples, usage).
	 * However, you can set this as a boolean to make all fields be either inline or not.
	 */
	inline?: boolean | InlineOptions;

	discordInteraction: {
		/**
		 * Discord slash command options
		 */
		slashCommandBuilder?: UniversalSlashCommandBuilder;
		/**
		 * Should this slash command be a global command?
		 *
		 * @default true
		 */
		global: boolean;
	};

	/** Contains the raw info of how this command was initialized. */
	rawInfo: BaseCommandOptions;

	/**
	 * Create a new BaseCommand.
	 *
	 * @param plugin Plugin that this command will be attached to
	 * @param info Command information
	 */
	constructor(plugin: BasePlugin, info: BaseCommandOptions) {
		super(plugin, info);

		this.plugin = plugin;
		this.rawInfo = info;

		this.fullId = `${plugin.id}.${this.type}.${info.id}`;
		this.paths = info.paths;
		this.group = info.group
			? info.group
			: plugin.group
			? plugin.group
			: "Other";
		this.groupEmote = plugin.groupEmote;
		this.aliases = info.aliases;

		if (typeof info.defaultPrefix == "string") {
			this.defaultPrefix = {
				discord: info.defaultPrefix,
				twitch: info.defaultPrefix,
				default: info.defaultPrefix,
			};
			this.defaultPrefixExplicitlySet = true;
		} else if (info.defaultPrefix != undefined) {
			this.defaultPrefix = info.defaultPrefix;
			this.defaultPrefixExplicitlySet = true;
		} else {
			this.defaultPrefix = {
				discord: this.client.discord.defaultPrefix,
				twitch: this.client.twitch.defaultPrefix,
				default: this.client.defaultPrefix,
			};
		}

		this.about = info.about;
		this.description = info.description;
		this.cooldown = info.cooldown;
		this.examples = info.examples;
		this.hideUsageInHelp = info.hideUsageInHelp;
		this.inline = info.inline ?? false;
		this.notes = info.notes;
		this.usage = info.usage;

		this.discordInteraction = {
			global:
				info.discordInteraction?.global != undefined
					? info.discordInteraction.global
					: true,
			slashCommandBuilder: info.discordInteraction?.slashCommandBuilder,
		};

		this.subcommands = new Map();
		this.subcommandAliases = new Map();
	}

	/**
	 * Run the command.
	 *
	 * @param msg Framed Message
	 *
	 * @returns true if successful
	 */
	abstract run(msg: BaseMessage, _?: unknown): Promise<boolean>;

	/**
	 * Puts all text entry fields into formatting
	 *
	 * @param place Place data
	 */
	getCommandNotationFormatting(place: Place): {
		about: string | undefined;
		description: string | undefined;
		examples: string | undefined;
		notes: string | undefined;
		usage: string | undefined;
	} {
		return {
			about: this.client.formatting.formatCommandNotation(
				this.about,
				this,
				place
			),
			description: this.client.formatting.formatCommandNotation(
				this.description,
				this,
				place
			),
			examples: this.client.formatting.formatCommandNotation(
				this.examples,
				this,
				place
			),
			notes: this.client.formatting.formatCommandNotation(
				this.notes,
				this,
				place
			),
			usage: this.client.formatting.formatCommandNotation(
				this.usage,
				this,
				place
			),
		};
	}

	//#region Prefix-related functions
	/**
	 * Gets the default prefix for the command.
	 *
	 * @param place Place data
	 */
	getDefaultPrefix(place: Place): string {
		// If the prefix is set explicitly in the script, use that instead
		if (this.defaultPrefixExplicitlySet) {
			switch (place.platform) {
				case "discord":
					return this.defaultPrefix.discord;
				case "twitch":
					return this.defaultPrefix.twitch;
				case "none":
					Logger.warn(
						oneLine`defaultPrefixExplicitSet:
						Couldn't find default prefix from client;
						falling back to defaultPrefix.default`
					);
					return this.defaultPrefix.default;
			}
		}

		const prefix = this.client.provider.prefixes.get(place.id);
		if (!prefix) {
			try {
				throw new Error(oneLine`Couldn't find default prefix from
				place ID ${place.id}; falling back to defaultPrefix.default`);
			} catch (error) {
				Logger.warn((error as Error).stack);
			}
			return this.defaultPrefix.default;
		}

		return prefix;
	}

	getDefaultPrefixFallback(place?: Place): string {
		switch (place?.platform) {
			case "discord":
				return this.defaultPrefix.discord;
			case "twitch":
				return this.defaultPrefix.twitch;
		}
		return this.defaultPrefix.default;
	}

	get defaultPlaceFallback(): Place {
		return {
			id: "default",
			platform: "none",
		};
	}

	/**
	 * Returns a list of prefixes that the command can use.
	 *
	 * @param placeOrPlatformId Place data, or a platform ID (ex. Discord guild ID, Twitch channel ID)
	 * @param checkDefault Checks if the default prefix is duplicated in the array
	 */
	getPrefixes(
		placeOrPlatformId: Place | string,
		checkDefault = true
	): string[] {
		const prefixes: string[] = [];

		// Puts all the command prefixes in an array
		if (this.rawInfo.prefixes) {
			prefixes.push(...this.rawInfo.prefixes);
		}

		// Get's this place's prefixes, and puts them into the array
		// for comparing if it contains the default prefix
		let place =
			typeof placeOrPlatformId == "string"
				? this.client.provider.places.get(placeOrPlatformId)
				: placeOrPlatformId;

		if (!place) {
			Logger.warn(
				oneLine`place for place ID ${placeOrPlatformId} wasn't found!`
			);
			place = this.defaultPlaceFallback;
		}

		if (checkDefault) {
			// Gets the default prefix
			const prefix = this.getDefaultPrefix(place);

			// If this list doesn't include the default prefix from there, add it to the array
			if (prefix != undefined && !prefixes.includes(prefix)) {
				prefixes.push(prefix);
			}
		}

		return prefixes;
	}
	//#endregion

	async getCooldown(userId: string): Promise<CooldownData | undefined> {
		return this.client.provider.cooldowns.get({
			userId,
			commandId: this.fullId,
		});
	}

	async setCooldown(userId: string): Promise<void> {
		if (!this.cooldown) return;

		const date = new Date();
		date.setSeconds(date.getSeconds() + this.cooldown?.time);

		return this.client.provider.cooldowns.set({
			userId: userId,
			commandId: this.fullId,
			cooldownDate: date,
		});
	}

	async sendCooldownErrorMessage(
		msg: BaseMessage,
		endDate: Date,
		currentDate = new Date()
	): Promise<boolean> {
		function parseDateToDiscordTimestamp(date: Date): string {
			return `<t:${(date.getTime() / 1000).toFixed(0)}:R>`;
		}

		const cooldownActive = endDate.getTime() > currentDate.getTime();
		if (!cooldownActive) {
			throw new Error(
				"Cooldown should have been denied; the cooldown end date is current."
			);
		}

		if (msg.discord?.guild?.me) {
			const me = msg.discord.guild.me;
			const channel = msg.discord.channel;
			if (channel instanceof Discord.TextChannel) {
				const perms = channel.permissionsFor(me);
				const canSend =
					channel instanceof Discord.ThreadChannel
						? perms.has("SEND_MESSAGES_IN_THREADS")
						: perms.has("SEND_MESSAGES");

				if (!canSend) {
					if (channel instanceof Discord.ThreadChannel) {
						throw new Error(oneLine`Missing SEND_MESSAGES_IN_THREADS
						permission, cannot send cooldown error message`);
					} else {
						throw new Error(oneLine`Missing SEND_MESSAGES permission,
						cannot send cooldown error message`);
					}
				}

				// https://stackoverflow.com/a/1322798
				const totalSeconds =
					(endDate.getTime() - currentDate.getTime()) / 1000;
				// let editTotalSeconds = totalSeconds;
				// const hours = Math.floor(editTotalSeconds / 3600);
				// editTotalSeconds = totalSeconds % 3600;
				// const minutes = Math.floor(editTotalSeconds / 60);
				// const seconds = editTotalSeconds % 60;

				const numText =
					totalSeconds > 1
						? Math.floor(totalSeconds)
						: totalSeconds.toFixed(0);
				const timestampText =
					// 45 is what I assume the seconds count when
					// relative timestamps only show "in a few seconds"
					totalSeconds > 45
						? parseDateToDiscordTimestamp(endDate)
						: `in ${numText} second${numText == "1" ? "" : "s"}`;

				await msg.send({
					content: stripIndents`
					You'll need to wait in order to use this again!
					The cooldown will be up ${timestampText}.`,
					ephemeral: true,
				});

				return true;
			}
		}
		{
			// TODO: Twitch cooldown logic, although by default
			// Nightbot doesn't send any error message when a
			// cooldown is still ticking.
		}

		return false;
	}

	//#region Loading in the subcommand

	/**
	 * Loads the plugins
	 * @param options RequireAll options
	 */
	loadSubcommandsIn(options: RequireAllOptions): void {
		const subcommands = Utils.importScripts(options) as (new (
			command: BaseCommand
		) => BaseSubcommand)[];
		this.loadSubcommands(subcommands);
	}

	/**
	 *
	 * @param subcommands
	 */
	loadSubcommands<T extends BaseSubcommand>(
		subcommands: (new (command: BaseCommand) => T)[]
	): void {
		for (const subcommand of subcommands) {
			const initSubcommand = new subcommand(this);
			this.loadSubcommand(initSubcommand);
		}
	}

	/**
	 *
	 * @param subcommand
	 */
	loadSubcommand<T extends BaseSubcommand>(subcommand: T): void {
		// Sets up the subcommand into the Map
		if (this.subcommands.get(subcommand.id)) {
			Logger.error(`Subcommand with id ${subcommand.id} already exists!`);
			return;
		}
		this.subcommands.set(subcommand.id, subcommand);

		if (subcommand.aliases) {
			for (const alias of subcommand.aliases) {
				if (this.subcommandAliases.get(alias)) {
					Logger.error(
						`Alias "${alias}" from subcommand "${subcommand.fullId}" already exists!`
					);
					continue;
				}
				this.subcommandAliases.set(alias, subcommand);
			}
		}

		Logger.debug(`Loaded subcommand ${subcommand.id}`);
	}

	//#endregion

	//#region Getting subcommands
	/**
	 * Gets the subcommand to run from command arguments.
	 *
	 * @param args Message arguments. This should likely equal
	 * `msg.args` from the Message class.
	 *
	 * @returns Subcommand or undefined
	 */
	getSubcommand(args: string[]): BaseSubcommand | undefined {
		const maxSubcommandNesting = 3;
		let finalSubcommand: BaseSubcommand | undefined;
		let newSubcommand: BaseSubcommand | undefined;

		for (let i = 0; i < maxSubcommandNesting + 1; i++) {
			const commandToCompare = newSubcommand ? newSubcommand : this;
			let subcommand = commandToCompare.subcommands.get(args[i]);
			if (!subcommand)
				subcommand = commandToCompare.subcommandAliases.get(args[i]);

			if (subcommand) {
				// If it hit max and isn't done
				if (i == maxSubcommandNesting) {
					Logger.error(oneLine`
					There are too many nested subcommands! The maximum is 3.
					The ${finalSubcommand?.fullId} subcommand will be ran anyway.`);
					break;
				}

				// Else, simply add it as a possible subcommand
				newSubcommand = subcommand;
			} else if (newSubcommand) {
				// Gets the previous new command as the final one, to be ran
				finalSubcommand = newSubcommand;
				break;
			} else {
				// There was no subcommand, so we return undefined
				return undefined;
			}
		}

		// If there was a final subcommand, return it
		if (finalSubcommand) {
			return finalSubcommand;
		}
	}

	/**
	 * Gets the nested subcommands.
	 *
	 * @param args Message arguments
	 */
	getSubcommandChain(args: string[]): BaseSubcommand[] {
		const maxSubcommandNesting = 3;
		const subcommands: BaseSubcommand[] = [];

		let finalSubcommand: BaseSubcommand | undefined;
		let newSubcommand: BaseSubcommand | undefined;

		for (let i = 0; i < maxSubcommandNesting + 1; i++) {
			const commandToCompare = newSubcommand ? newSubcommand : this;
			let subcommand = commandToCompare.subcommands.get(args[i]);
			if (!subcommand)
				subcommand = commandToCompare.subcommandAliases.get(args[i]);

			if (subcommand) {
				// If it hit max and isn't done
				if (i == maxSubcommandNesting) {
					Logger.error(oneLine`
					There are too many nested subcommands! The maximum is 3.
					The ${finalSubcommand?.fullId} subcommand will be ran anyway.`);
					break;
				}

				// Else, simply add the new subcommand to our list
				subcommands.push(subcommand);
				newSubcommand = subcommand;
			} else {
				// There are no new subcommand, so we return the array
				return subcommands;
			}
		}

		return subcommands;
	}
	//#endregion
}
