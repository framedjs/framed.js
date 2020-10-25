import { CommandClass } from "./Command";
import { framedClient } from "../index";

// Platform
import Utils from "../util/Utils";
import util from "util";
import { logger } from "shared";

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
	changelog?: {};
	paths: {
		commands: string;
	};
}

export abstract class PluginClass {
	public readonly config: PluginConfig;
	public commands = new Map<string, CommandClass>();

	constructor(config: PluginConfig) {
		this.config = config;
	}

	importCommands(commandPath: string): void {
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
						logger.error("Failed to import: imported command ID already exists.");
					} else {
						this.commands.set(
							importedCommand.info.id,
							importedCommand
						);
						importedCommand.plugin = this;
					}
					framedClient.pluginManager.importingCommand = undefined;
				} else {
					logger.error(
						`Failed to import: Script ${commandString} may not be a valid Command?`
					);
					continue;
				}
				logger.debug(`Finished loading from ${commandString}`);
			} catch (error) {
				logger.error(`Found a command, but failed to import.\n${error.stack}`);
			}
		}

		const name = this.config.info.name;
		logger.debug(`Finished loading commands from plugin ${name}.`);
		// logger.debug(`Commands: ${util.inspect(this.commands)}`);
	}
}
