import { BaseCommand } from "./BaseCommand";
import { framedClient } from "../index";
import { Utils, logger } from "shared";
import FramedClient from "./FramedClient";
import * as DiscordUtils from "../utils/DiscordUtils";
import util from "util";
import { PluginInfo } from "../interfaces/PluginInfo";

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

	async importCommands(commandPath?: string): Promise<void> {
		if (commandPath) {
			const filter = (file: string) =>
				file.endsWith(".ts") || file.endsWith(".js");
			const commands = Utils.findFileNested(commandPath, filter);

			for (const commandString of commands) {
				try {
					const { default: Command } = await import(commandString);
					const importedCommand: BaseCommand = new Command();

					if (importedCommand) {
						if (this.commands.get(importedCommand.id)) {
							logger.error(
								"Failed to import: imported command ID already exists."
							);
						} else {
							this.commands.set(
								importedCommand.id,
								importedCommand
							);
							importedCommand.plugin = this;
						}
						// framedClient.pluginManager.importingCommand = undefined;
						logger.verbose(
							`Finished loading from ${commandString}`
						);
					} else {
						logger.error(
							`Failed to import: Script ${commandString} may not be a valid Command?`
						);
					}
				} catch (error) {
					logger.error(
						`Found a command, but failed to import it:\n${error.stack}`
					);
				}
			}

			logger.verbose(
				`Finished loading commands from plugin ${this.name}.`
			);
			// logger.debug(`Commands: ${util.inspect(this.commands)}`);
		} else {
			logger.verbose(`No commands to import from plugin ${this.name}.`);
		}
	}

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
}
