import fs from "fs";
import path from "path";
import util from "util";

// Platform
import * as Discord from "discord.js";

// Plugin-related
// import Command from "../structures/Command";
import PluginClass, { PluginConfig } from "../structures/Plugin";
// import Message from "../structures/Message";
import { logger } from "shared";
import Utils from "../util/Utils";
import { CommandExecutor, CommandProp } from "../structures/Command";

export default class PluginManager {
	public plugins = new Map<string, PluginClass>();
	// public commands = new Map<string, Command>();
	// testCollection = new Discord.Collection<string, Command>();
	public importingCommand?: CommandProp;

	constructor() {
		// this.commands = new Discord.Collection<string, Command>();
		// for (const command of Array.from(this.commands.values())) {
		// 	command.
		// }
	}

	loadPlugins(): void {
		logger.info("Importing plugins...");

		const pluginPath = path.join(__dirname, "..", "..", "plugins");
		logger.debug(`path: ${pluginPath}`);

		this.plugins = new Map<string, PluginClass>();

		const filter = (file: string) =>
			file.endsWith("plugin.ts") || file.endsWith("plugin.js");
		const plugins = Utils.findFileNested(pluginPath, filter);

		// Imports all the plugins
		for (const pluginString of plugins) {
			try {
				// eslint-disable-next-line @typescript-eslint/no-var-requires
				require(pluginString);
			} catch (error) {
				logger.error(`Found a plugin, but failed to import:\n${error.stack}`);
			}
		}
	}

	loadPlugin(config: PluginConfig, plugin: PluginClass): void {
		if (this.plugins.get(config.info.id)) {
			logger.error(`Plugin with id ${config.info.id} already exists!`);
			return;
		}
		this.plugins.set(config.info.id, plugin);
		plugin.importCommands(config.paths.commands, plugin);
		logger.debug(`Finished loading plugin ${config.info.name} v${config.info.version}.`);
	}

	async runCommand(): Promise<void> {
		//
	}
}
