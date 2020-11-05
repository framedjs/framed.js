import util from "util";
import { BasePlugin as BasePlugin } from "../structures/BasePlugin";
import { logger } from "shared";
import { BaseCommand } from "../structures/BaseCommand";
import FramedClient from "../structures/FramedClient";
import * as DiscordUtils from "../utils/DiscordUtils";


export default class PluginManager {
	public readonly framedClient: FramedClient;
	public plugins = new Map<string, BasePlugin>();
	// public importingCommand?: BaseCommand;

	/**
	 * 
	 * @param framedClient 
	 */
	constructor(framedClient: FramedClient) {
		this.framedClient = framedClient;
	}

	/**
	 *
	 * @param options
	 */
	loadPluginsIn(options: DiscordUtils.Options): void {
		const plugins = DiscordUtils.importScripts(options);
		logger.debug(`Plugins: ${util.inspect(plugins)}`);
		this.loadPlugins(plugins);
	}

	/**
	 * 
	 * @param plugins 
	 */
	loadPlugins<T extends BasePlugin>(
		plugins: (new (framedClient: FramedClient) => T)[]
	): void {
		for (const plugin of plugins) {
			const initPlugin = new plugin(this.framedClient);
			// logger.debug(`initPlugin: ${util.inspect(initPlugin)}`);
			this.loadPlugin(initPlugin);
		}
	}

	/**
	 * 
	 * @param plugin 
	 */
	loadPlugin<T extends BasePlugin>(plugin: T): void {
		if (this.plugins.get(plugin.id)) {
			logger.error(
				`Plugin with id ${plugin.id} already exists!`
			);
			return;
		}

		this.plugins.set(plugin.id, plugin);

		// Import commands
		if (plugin.paths.commands) {
			plugin.loadCommandsIn({
				dirname: plugin.paths.commands,
				filter: /^(.*)\.(js|ts)$/,
			});
		}

		// plugin.importCommands(plugin.config.paths.commands);
		plugin.importEvents(plugin.paths.events);
		logger.verbose(
			`Finished loading plugin ${plugin.name} v${plugin.version}.`
		);
	}
}
