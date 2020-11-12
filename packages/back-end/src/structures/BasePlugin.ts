import { BaseCommand } from "./BaseCommand";
import { Utils, logger } from "shared";
import FramedClient from "./FramedClient";
import * as DiscordUtils from "../utils/DiscordUtils";
import util from "util";
import { PluginInfo } from "../interfaces/PluginInfo";
import { BaseEvent } from "./BaseEvent";

export abstract class BasePlugin {
	readonly framedClient: FramedClient;

	id: string;
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
	};

	commands = new Map<string, BaseCommand>();

	constructor(framedClient: FramedClient, info: PluginInfo) {
		this.framedClient = framedClient;

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
	}

	//#region Command loading

	/**
	 *
	 * @param options
	 */
	loadCommandsIn(options: DiscordUtils.Options): void {
		const commands = DiscordUtils.importScripts(options);
		logger.debug(`Commands: ${util.inspect(commands)}`);
		this.loadCommands(commands);
	}

	/**
	 *
	 * @param commands
	 */
	loadCommands<T extends BaseCommand>(
		commands: (new (plugin: BasePlugin) => T)[]
	): void {
		for (const command of commands) {
			const initPlugin = new command(this);
			this.loadCommand(initPlugin);
		}
	}

	/**
	 *
	 * @param command
	 */
	loadCommand<T extends BaseCommand>(command: T): void {
		if (this.commands.get(command.id)) {
			logger.error(`Command with id ${command.id} already exists!`);
			return;
		}

		this.commands.set(command.id, command);

		logger.verbose(`Finished loading command ${command.name}.`);
	}

	//#endregion

	//#region Event loading

	importEvents(eventsPath?: string): void {
		if (eventsPath) {
			logger.verbose("Importing events...");

			try {
				const filter = (file: string) =>
					file.endsWith(".ts") || file.endsWith(".js");
				const events = Utils.findFileNested(eventsPath, filter);

				// Imports all the events
				for (const eventsString of events) {
					try {
						require(eventsString);
						logger.verbose(`Finished loading from ${eventsString}`);
					} catch (error) {
						logger.error(
							`Found an event, but failed to import it:\n${error.stack}`
						);
					}
				}
			} catch (error) {
				logger.error(
					`Error importing event, likely because the path doesn't exist: ${error.stack}`
				);
			}
		} else {
			logger.verbose(`No events to import from plugin ${this.name}.`);
		}
	}

	/**
	 *
	 * @param options
	 */
	loadEventsIn(options: DiscordUtils.Options): void {
		const events = DiscordUtils.importScripts(options);
		logger.debug(`Events: ${util.inspect(events)}`);
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
			const initEvent = new event(this);
			this.loadEvent(initEvent);
		}
	}

	/**
	 *
	 * @param event
	 */
	loadEvent<T extends BaseEvent>(event: T): void {
		this.framedClient.client.on(event.name, event.run.bind(null));
		logger.verbose(`Finished loading event ${event.name}.`);
	}

	//#endregion
}
