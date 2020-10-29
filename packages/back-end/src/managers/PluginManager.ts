import path from "path";

// Plugin-related
import { PluginClass } from "../structures/Plugin";
import { logger, Utils } from "shared";
import { CommandClass } from "../structures/Command";

export default class PluginManager {
	public plugins = new Map<string, PluginClass>();
	// public commands = new Map<string, Command>();
	// testCollection = new Discord.Collection<string, Command>();
	public importingCommand?: CommandClass;

	constructor() {
		// this.commands = new Discord.Collection<string, Command>();
		// for (const command of Array.from(this.commands.values())) {
		// 	command.
		// }
	}

	loadPlugins(): void {
		logger.info("Importing plugins...");

		const pluginPath = path.join(__dirname, "..", "..", "plugins");
		logger.debug(`Using plugin path: ${pluginPath}`);

		this.plugins = new Map<string, PluginClass>();

		const filter = (file: string) =>
			file.endsWith("plugin.ts") || file.endsWith("plugin.js");
		const plugins = Utils.findFileNested(pluginPath, filter);

		// Imports all the plugins
		for (const pluginString of plugins) {
			try {
				require(pluginString);
			} catch (error) {
				logger.error(`Found a plugin, but failed to import it:\n${error.stack}`);
			}
		}
	}

	loadPlugin(plugin: PluginClass): void {
		if (this.plugins.get(plugin.config.info.id)) {
			logger.error(`Plugin with id ${plugin.config.info.id} already exists!`);
			return;
		}
		this.plugins.set(plugin.config.info.id, plugin);
		plugin.importCommands(plugin.config.paths.commands);
		plugin.importEvents(plugin.config.paths.events);
		logger.debug(`Finished loading plugin ${plugin.config.info.name} v${plugin.config.info.version}.`);
	}
}
