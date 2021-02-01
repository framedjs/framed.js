import { BaseCommand } from "./BaseCommand";
import { BaseSubcommand } from "./BaseSubcommand";
import { BaseEvent } from "./BaseEvent";
import { BasePluginOptions } from "../interfaces/BasePluginOptions";
import { Logger } from "@framedjs/logger";
import { Client } from "./Client";
import { PluginManager } from "../managers/PluginManager";
import { DiscordUtils } from "../utils/discord/DiscordUtils";
import Options from "../interfaces/other/RequireAllOptions";
import util from "util";
import { Prefixes } from "../interfaces/Prefixes";

export abstract class BasePlugin {
	readonly client: Client;
	readonly plugins: PluginManager;

	id: string;

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
	paths: {
		commands?: string;
		events?: string;
		routes?: string;
	};

	commands = new Map<string, BaseCommand>();
	aliases = new Map<string, BaseCommand>();
	events = new Map<string, BaseEvent>();

	constructor(client: Client, info: BasePluginOptions) {
		this.client = client;
		this.plugins = client.plugins;

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

	getDefaultPrefix(guildOrTwitchId = "default"): string {
		const prefix = this.client.getGuildOrTwitchIdPrefix(
			"default",
			guildOrTwitchId,
		);
		if (!prefix) {
			Logger.warn(
				"Couldn't find default prefix from client; falling back to defaultPrefix.default"
			);
			return this.defaultPrefix.default;
		}
		return prefix;
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
				Logger.error(error.stack);
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
			command.loadSubcommandsIn({
				dirname: command.paths.subcommands,
				filter: (name: string) => {
					const match = name.match(this.client.importFilter);
					if (match) return name;
				},
				recursive: false,
			});
		}

		Logger.debug(`Loaded command "${command.id}"`);
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
				Logger.error(error.stack);
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
			this.client.discord.client.on(
				event.discord.name,
				event.run.bind(event)
			);
			Logger.debug(
				`Loaded event with ID "${event.id}" (${event.plugin.id})`
			);
		} else {
			Logger.warn(
				`There was an imported event with no Discord event! Only Discord is supported currently.`
			);
		}
	}

	//#endregion
}
