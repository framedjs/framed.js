import { Base } from "./Base";
import { BaseCommand } from "./BaseCommand";
import { BaseDiscordInteraction } from "./BaseDiscordInteraction";
import { BaseEvent } from "./BaseEvent";
import { BaseSubcommand } from "./BaseSubcommand";
import { Client } from "./Client";
import { ImportError } from "./errors/non-friendly/ImportError";
import { BaseDiscordMenuFlow } from "./BaseDiscordMenuFlow";
import { Logger } from "@framedjs/logger";
import { Utils } from "@framedjs/shared";

import type { Prefixes } from "../interfaces/Prefixes";
import type { RequireAllOptions } from "@framedjs/shared";
import type {
	BasePluginOptions,
	BasePluginPathOptions,
} from "../interfaces/BasePluginOptions";

import util from "util";

export abstract class BasePlugin extends Base {
	id: string;

	commandLoadOptions: RequireAllOptions | undefined;

	protected subcommandLoadOptions(dirname: string): RequireAllOptions {
		return {
			dirname: dirname,
			filter: (name: string) => {
				const match = name.match(this.client.importFilter);
				if (match) return name;
			},
			recursive: false,
		};
	}

	protected discordMenuFlowLoadOptions(dirname: string): RequireAllOptions {
		return {
			dirname: dirname,
			filter: (name: string) => {
				const match = name.match(this.client.importFilter);
				if (match) return name;
			},
			recursive: false,
		};
	}

	group: string;
	groupEmote: string;
	groupId: string;
	fullGroupId: string;

	defaultPrefix: Prefixes;
	name: string;
	description: string;
	version: string;
	authors?: [
		{
			discordTag?: string;
			discordId?: string;

			twitchUsername?: string;
			twitchId?: string;

			githubUsername?: string;
			// githubId?: string,

			twitterUsername?: string;
			// twitterId?: string,
		}
	];
	githubRepo?: string;
	githubRaw?: string;
	changelog?: [
		{
			version: string;
		}
	];
	paths: BasePluginPathOptions;

	commands = new Map<string, BaseCommand>();
	aliases = new Map<string, BaseCommand>();
	events = new Map<string, BaseEvent>();
	discordInteractions = new Map<string, BaseDiscordInteraction>();
	discordMenuFlows = new Map<string, BaseDiscordMenuFlow>();

	constructor(client: Client, info: BasePluginOptions) {
		super(client);

		this.id = info.id;

		if (typeof info.defaultPrefix == "string") {
			this.defaultPrefix = {
				discord: info.defaultPrefix,
				twitch: info.defaultPrefix,
				default: info.defaultPrefix,
			};
		} else if (info.defaultPrefix != undefined) {
			this.defaultPrefix = info.defaultPrefix;
		} else {
			this.defaultPrefix = {
				discord: client.discord.defaultPrefix,
				twitch: client.twitch.defaultPrefix,
				default: client.defaultPrefix,
			};
		}

		this.name = info.name;
		this.description = info.description;
		this.version = info.version;
		this.authors = info.authors;
		this.githubRepo = info.githubRepo;
		this.githubRaw = info.githubRaw;
		this.changelog = info.changelog;
		this.paths = info.paths;

		// Default group logic
		this.group = info.groupName ? info.groupName : info.name;
		this.groupEmote = info.groupEmote ? info.groupEmote : "❔";
		this.groupId = info.groupId ? info.groupId : "default";
		this.fullGroupId = `${this.id}.group.${this.groupId}`;
	}

	/**
	 * Installs anything onto the database the plugin would like to put in.
	 *
	 * This function will be called when the plugin is first ran.
	 */
	install?(): Promise<void>;

	/**
	 * This function will be called after the install of plugins.
	 *
	 * This can be used for scenarios such as updating old install data.
	 */
	postInstall?(): Promise<void>;

	/**
	 * This function will be called after the providers have loaded all data from cache.
	 */
	loadedProviders?(): Promise<void>;

	//#region Command loading

	/**
	 * Loads commands, through RequireAll options.
	 * @param options
	 */
	loadCommandsIn(options: RequireAllOptions): void {
		this.commandLoadOptions = options;
		const commands = Utils.importScripts(options) as (new (
			plugin: BasePlugin
		) => BaseCommand)[];
		Logger.silly(`Commands: ${util.inspect(commands)}`);
		this.loadCommands(commands);
	}

	/**
	 * Loads commands from a list of uninitiated classes.
	 *
	 * This function will attempt to get the instance of the new command,
	 * and then compare if it is just a BaseCommand and not a BaseSubcommand.
	 *
	 * BaseSubcommand will get imported by the BaseCommand itself.
	 *
	 * @param commands
	 */
	loadCommands<T extends BaseCommand>(
		commands: (new (plugin: BasePlugin) => T)[]
	): void {
		for (const command of commands) {
			try {
				const initCommand = new command(this);
				if (
					!(initCommand instanceof BaseSubcommand) &&
					initCommand instanceof BaseCommand
				) {
					this.loadCommand(initCommand);
				}
			} catch (error) {
				if (error instanceof ImportError) {
					// Wrong import type was used
					if (
						process.env.FRAMED_HIDE_INSTANCE_IMPORT_ERROR?.toLocaleLowerCase() ==
						"false"
					) {
						Logger.silly(
							`~99% safe to ignore: ${(error as Error).stack}`
						);
					}
				} else {
					// If it's something else, a normal error will appear
					Logger.error((error as Error).stack);
				}
			}
		}
	}

	/**
	 *
	 * @param command
	 */
	loadCommand<T extends BaseCommand>(command: T): void {
		// Sets up some commands
		if (this.commands.get(command.id)) {
			Logger.error(`Command with ID "${command.id}" already exists!`);
			return;
		}
		this.commands.set(command.id, command);

		// Sets up some aliases
		if (command.aliases) {
			for (const alias of command.aliases) {
				if (this.aliases.get(alias)) {
					Logger.error(
						`Alias "${alias}" from command ID "${command.id}" already exists!`
					);
					continue;
				}
				this.aliases.set(alias, command);
			}
		}

		// Load subcommands from script
		if (command.paths?.subcommands) {
			command.loadSubcommandsIn(
				this.subcommandLoadOptions(command.paths.subcommands)
			);
		}

		Logger.debug(`Loaded command "${command.id}"`);
	}

	unloadCommands(): void {
		for (const [id] of this.commands) {
			this.unloadCommand(id);
		}
	}

	/**
	 *
	 * @param id
	 */
	unloadCommand(id: string): void {
		const command = this.commands.get(id);
		if (!command) {
			Logger.error(`Command ID ${id} doesn't exist!`);
			return;
		}
		this.commands.delete(id);

		// Sets up some aliases
		if (command.aliases) {
			for (const alias of command.aliases) {
				const aliasDeleteResult = this.aliases.delete(alias);
				if (!aliasDeleteResult) {
					Logger.warn(
						`Alias "${alias}" from command ID "${id}" doesn't exist!`
					);
					continue;
				}
			}
		}

		// Load subcommands from script
		// TODO
		// if (command.paths?.subcommands) {
		// 	command.loadSubcommandsIn({
		// 		dirname: command.paths.subcommands,
		// 		filter: (name: string) => {
		// 			const match = name.match(this.client.importFilter);
		// 			if (match) return name;
		// 		},
		// 		recursive: false,
		// 	});
		// }

		Logger.debug(`Unloaded command "${command.id}"`);
	}

	//#endregion

	//#region Event loading

	/**
	 *
	 * @param options
	 */
	loadEventsIn(options: RequireAllOptions): void {
		const events = Utils.importScripts(options) as (new (
			plugin: BasePlugin
		) => BaseEvent)[];
		Logger.silly(`Events: ${util.inspect(events)}`);
		this.loadEvents(events);
	}

	/**
	 *
	 * @param events
	 */
	loadEvents<T extends BaseEvent>(
		events: (new (plugin: BasePlugin) => T)[]
	): void {
		for (const event of events) {
			try {
				const initEvent = new event(this);
				this.loadEvent(initEvent);
			} catch (error) {
				Logger.error((error as Error).stack);
			}
		}
	}

	/**
	 *
	 * @param event
	 */
	loadEvent<T extends BaseEvent>(event: T): void {
		// Sets up some commands
		if (this.events.get(event.id)) {
			Logger.error(`Event with ID "${event.id}" already exists!`);
			return;
		}
		this.events.set(event.id, event);

		// Initializes the events if there is an availiable client right now
		if (
			this.client.discord.client &&
			this.client.discord.client.readyTimestamp
		) {
			this.initEvent(event);
		}
	}

	/**
	 *
	 * @param event BaseEvent
	 */
	initEvent(event: BaseEvent): void {
		if (event.discord) {
			if (!this.client.discord.client) {
				throw new Error(`Discord client doesn't exist!`);
			}
			event.init();
			Logger.debug(
				`Loaded event with ID "${event.id}" (${event.plugin.id})`
			);
		} else {
			Logger.warn(
				`There was an imported event with no Discord event! Only Discord is supported currently.`
			);
		}
	}

	unloadEvents(): void {
		if (!this.client.discord.client) {
			throw new Error(`Discord client doesn't exist!`);
		}

		for (const [, event] of this.events) {
			this.unloadEvent(event);
		}
		this.client.discord.client.removeAllListeners();

		Logger.debug(`Unloaded events from plugin ${this.id}`);
	}

	unloadEvent(eventOrId: BaseEvent | string): void {
		let event: BaseEvent | undefined;
		let id: string | undefined;

		if (eventOrId instanceof BaseEvent) {
			event = eventOrId;
			id = event.id;
		} else {
			id = eventOrId;
		}

		if (!event) {
			event = this.events.get(id);
			if (!event) {
				Logger.error("Event wasn't found!");
				return;
			}
		}

		this.events.delete(id);

		if (!this.client.discord.client) {
			throw new Error(`Discord client doesn't exist!`);
		}
	}

	async setupEvents(): Promise<void> {
		return;
	}

	//#endregion

	//#region Interaction loading

	/**
	 * Loads Discord interactions, through RequireAll options.
	 * @param options
	 */
	loadDiscordInteractionsIn(options: RequireAllOptions): void {
		const interactions = Utils.importScripts(options) as (new (
			plugin: BasePlugin
		) => BaseDiscordInteraction)[];
		Logger.silly(`Interactions: ${util.inspect(interactions)}`);
		this.loadDiscordInteractions(interactions);
	}

	/**
	 * Loads interactions from a list of uninitiated classes.
	 *
	 * This function will attempt to get the instance of the new command,
	 * and then compare if it is just a BaseInteraction and not a BaseSubcommand.
	 *
	 * BaseSubcommand will get imported by the BaseInteraction itself.
	 *
	 * @param interactions
	 */
	loadDiscordInteractions<T extends BaseDiscordInteraction>(
		interactions: (new (plugin: BasePlugin) => T)[]
	): void {
		for (const interaction of interactions) {
			try {
				const initInteraction = new interaction(this);
				if (initInteraction instanceof BaseDiscordInteraction) {
					this.loadInteraction(initInteraction);
				}
			} catch (error) {
				if (error instanceof ImportError) {
					// Wrong import type was used
					if (
						process.env.FRAMED_HIDE_INSTANCE_IMPORT_ERROR?.toLocaleLowerCase() ==
						"true"
					) {
						Logger.silly(
							`~99% safe to ignore: ${(error as Error).stack}`
						);
					}
				} else {
					// If it's something else, a normal error will appear
					Logger.error((error as Error).stack);
				}
			}
		}
	}

	/**
	 *
	 * @param command
	 */
	loadInteraction<T extends BaseDiscordInteraction>(command: T): void {
		// Sets up some interactions
		if (this.discordInteractions.get(command.fullId)) {
			Logger.error(
				`Interaction with ID "${command.fullId}" already exists!`
			);
			return;
		}
		this.discordInteractions.set(command.fullId, command);

		Logger.debug(`Loaded Discord interaction "${command.fullId}"`);
	}
	//#endregion

	//#region Discord Menu Flow loading

	/**
	 * Loads Discord menu flows, through RequireAll options.
	 * @param options
	 */
	loadMenuFlowsIn(options: RequireAllOptions): void {
		this.commandLoadOptions = options;
		const menuFlows = Utils.importScripts(options) as (new (
			plugin: BasePlugin
		) => BaseDiscordMenuFlow)[];
		Logger.silly(`Menu Flows: ${util.inspect(menuFlows)}`);
		this.loadMenuFlows(menuFlows);
	}

	loadMenuFlows<T extends BaseDiscordMenuFlow>(
		menuFlows: (new (plugin: BasePlugin) => T)[]
	): void {
		for (const menu of menuFlows) {
			try {
				const initMenuFlow = new menu(this);
				if (initMenuFlow instanceof BaseDiscordMenuFlow) {
					this.loadMenuFlow(initMenuFlow);
				}
			} catch (error) {
				if (error instanceof ImportError) {
					// Wrong import type was used
					if (
						process.env.FRAMED_HIDE_INSTANCE_IMPORT_ERROR?.toLocaleLowerCase() !=
						"true"
					) {
						Logger.silly(
							`~99% safe to ignore: ${(error as Error).stack}`
						);
					}
				} else {
					// If it's something else, a normal error will appear
					Logger.error((error as Error).stack);
				}
			}
		}
	}

	loadMenuFlow<T extends BaseDiscordMenuFlow>(menu: T): void {
		// Sets up some menus into the Map
		if (this.discordMenuFlows.get(menu.rawId)) {
			Logger.error(`Menu flow with ID "${menu.rawId}" already exists!`);
			return;
		}
		this.discordMenuFlows.set(menu.rawId, menu);

		// Load pages from script
		menu.loadPagesIn(this.discordMenuFlowLoadOptions(menu.paths.pages));

		Logger.debug(`Loaded menu flow "${menu.rawId}"`);
	}

	unloadMenuFlows(): void {
		for (const [id] of this.commands) {
			this.unloadMenuFlow(id);
		}
	}

	unloadMenuFlow(rawId: string): void {
		const menu = this.discordMenuFlows.get(rawId);
		if (!menu) {
			Logger.error(`Menu flow ID ${rawId} doesn't exist!`);
			return;
		}
		this.discordMenuFlows.delete(rawId);

		Logger.debug(`Unloaded menu flow "${rawId}"`);
	}

	//#endregion
}
