import CommandClass, { CommandExecutor } from "./Command";
import { framedClient } from "../index";

// Platform
import Utils from "../util/Utils";
import util from "util";
import { logger } from "shared";

export function Plugin(config: PluginConfig) {
	return function (target: { new(): PluginClass }): void {
		logger.debug("Plugin decorator called");
		logger.info(`Importing plugin ${config.info.name} v${config.info.version}.`);
		const plugin = new target();
		framedClient.pluginManager.loadPlugin(config, plugin);
	}
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
		commands: string
	}
}

export default abstract class PluginClass {
	public readonly config: PluginConfig;
	public commands = new Map<string, CommandExecutor>();
	
	constructor(config: PluginConfig) {
		this.config = config;
		// this.importCommands(commandPath);
	}

	// public get config(): PluginConfig | undefined {
	// 	return this._config;
	// }

	// setConfig(): void {

	// }

	importCommands(commandPath: string, plugin: PluginClass): void {
		const filter = (file: string) =>
			file.endsWith(".ts") || file.endsWith(".js");
		const commands = Utils.findFileNested(commandPath, filter);

		for (const commandString of commands) {
			try {
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				require(commandString);

				// Check if import was successful
				const importedCommand = framedClient.pluginManager.importingCommand;
				if (importedCommand) {
					if (plugin.commands.get(importedCommand.info.id)) {
						logger.error("pain");
					}
					else {
						plugin.commands.set(importedCommand.info.id, importedCommand.exec);
					}
				} else {
					logger.error("Failed to import: Couldn't find reference to imported command.");
				}
				logger.debug(`Finished loading from ${commandString}`);
			} catch (error) {
				logger.error("Found a command, but failed to import.");
			}
		}

		const name = plugin.config.info.name;
		logger.debug(`Finished loading commands from plugin ${name}.`);
	}
}
