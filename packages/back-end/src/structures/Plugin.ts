import { CommandClass } from "./Command";
import { framedClient } from "../index";
import { Utils, logger } from "shared";
import path from "path";

export function Plugin() {
	return function (target: { new (): PluginClass }): void {
		const plugin = new target();
		logger.info(
			`Importing plugin ${plugin.config.info.name} v${plugin.config.info.version}.`
		);
		framedClient.pluginManager.loadPlugin(plugin);
	};
}

export interface PluginConfig {
	info: {
		id: string;
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
	};
	changelog?: [
		{
			version: string;
		}
	];
	paths: {
		commands?: string;
		events?: string;
	};
}

export abstract class PluginClass {
	public readonly config: PluginConfig;
	public commands = new Map<string, CommandClass>();

	constructor(config: PluginConfig) {
		this.config = config;
	}

	importCommands(commandPath?: string): void {
		if (commandPath) {
			const filter = (file: string) =>
				file.endsWith(".ts") || file.endsWith(".js");
			const commands = Utils.findFileNested(commandPath, filter);

			for (const commandString of commands) {
				try {
					require(commandString);

					// Check if import was successful
					const importedCommand =
						framedClient.pluginManager.importingCommand;
					if (importedCommand) {
						if (this.commands.get(importedCommand.info.id)) {
							logger.error(
								"Failed to import: imported command ID already exists."
							);
						} else {
							this.commands.set(
								importedCommand.info.id,
								importedCommand
							);
							importedCommand.plugin = this;
						}
						framedClient.pluginManager.importingCommand = undefined;
						logger.debug(`Finished loading from ${commandString}`);
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

			logger.debug(
				`Finished loading commands from plugin ${this.config.info.name}.`
			);
			// logger.debug(`Commands: ${util.inspect(this.commands)}`);
		} else {
			logger.debug(
				`No commands to import from plugin ${this.config.info.name}.`
			);
		}
	}

	importEvents(eventsPath?: string): void {
		if (eventsPath) {
			logger.debug("Importing events...");

			try {
				const filter = (file: string) =>
					file.endsWith(".ts") || file.endsWith(".js");
				const events = Utils.findFileNested(eventsPath, filter);

				// Imports all the events
				for (const eventsString of events) {
					try {
						require(eventsString);
						logger.debug(`Finished loading from ${eventsString}`);
					} catch (error) {
						logger.error(
							`Found an event, but failed to import it:\n${error.stack}`
						);
					}
				}
			} catch (error) {
				logger.debug(`Error importing event, likely because the path doesn't exist: ${error.stack}`);
			}
		} else {
			logger.debug(
				`No events to import from plugin ${this.config.info.name}.`
			);
		}
	}
}
