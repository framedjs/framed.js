import { BaseCommand } from "./BaseCommand";
import { logger } from "shared";
import FramedClient from "./FramedClient";
import DiscordUtils from "../utils/discord/DiscordUtils";
import util from "util";
import { BasePluginOptions } from "../interfaces/BasePluginOptions";
import { BaseEvent } from "./BaseEvent";
import PluginManager from "../managers/PluginManager";
import Options from "../interfaces/RequireAllOptions";
import { BaseSubcommand } from "./BaseSubcommand";

export abstract class BasePlugin {
	readonly framedClient: FramedClient;
	readonly plugins: PluginManager;

	id: string;

	group: string;
	groupEmote: string;
	groupId: string;
	fullGroupId: string;

	defaultPrefix: string;
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
	paths: {
		commands?: string;
		events?: string;
		routes?: string;
	};

	commands = new Map<string, BaseCommand>();
	aliases = new Map<string, BaseCommand>();
	events = new Map<string, BaseEvent>();

	constructor(framedClient: FramedClient, info: BasePluginOptions) {
		this.framedClient = framedClient;
		this.plugins = framedClient.plugins;

		this.id = info.id;
		this.defaultPrefix =
			info.defaultPrefix != undefined
				? info.defaultPrefix
				: framedClient.defaultPrefix;
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

	//#region Command loading

	/**
	 * Loads commands, through RequireAll options.
	 * @param options
	 */
	loadCommandsIn(options: Options): void {
		const commands = DiscordUtils.importScripts(options) as (new (
			plugin: BasePlugin
		) => BaseCommand)[];
		logger.silly(`Commands: ${util.inspect(commands)}`);
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
				logger.error(error.stack);
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
			logger.error(`Command with ID "${command.id}" already exists!`);
			return;
		}
		this.commands.set(command.id, command);

		// Note that this normally is async. Should that be changed?
		command.parseCustomFormatting();

		// Skip over subcommand scripts
		// if (command instanceof BaseSubcommand) {
		// 	return;
		// }

		// Sets up some aliases
		if (command.aliases) {
			for (const alias of command.aliases) {
				if (this.aliases.get(alias)) {
					logger.error(
						`Alias "${alias}" from command ID "${command.id}" already exists!`
					);
					continue;
				}
				this.aliases.set(alias, command);
			}
		}

		// Load subcommands from script
		if (command.paths?.subcommands) {
			command.loadSubcommandsIn({
				dirname: command.paths.subcommands,
				filter: (name: string) => {
					const match = name.match(this.framedClient.importFilter);
					if (match) return name;
				},
				recursive: false,
			});
		}

		logger.debug(`Finished loading command "${command.id}".`);
	}

	//#endregion

	//#region Event loading

	/**
	 *
	 * @param options
	 */
	loadEventsIn(options: Options): void {
		const events = DiscordUtils.importScripts(options) as (new (
			plugin: BasePlugin
		) => BaseEvent)[];
		logger.silly(`Events: ${util.inspect(events)}`);
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
				logger.error(error.stack);
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
			logger.error(`Event with ID "${event.id}" already exists!`);
			return;
		}
		this.events.set(event.id, event);

		// Initializes the events if there is an availiable client right now
		if (
			this.framedClient.discord.client &&
			this.framedClient.discord.client.readyTimestamp
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
			if (!this.framedClient.discord.client) {
				throw new Error(`Discord client doesn't exist!`);
			}
			event.init();
			this.framedClient.discord.client.on(
				event.discord.name,
				event.run.bind(event)
			);
			logger.debug(`Finished loading event with ID "${event.id}" (${event.plugin.id})`);
		} else {
			logger.warn(
				`There was an imported event with no Discord event! Only Discord is supported currently.`
			);
		}
	}

	//#endregion
}
