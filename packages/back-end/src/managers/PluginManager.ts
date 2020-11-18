import util from "util";
import { BasePlugin } from "../structures/BasePlugin";
import { logger } from "shared";
import FramedClient from "../structures/FramedClient";
import * as DiscordUtils from "../utils/DiscordUtils";
import FramedMessage from "../structures/FramedMessage";
import { BaseCommand } from "../structures/BaseCommand";

export default class PluginManager {
	public plugins = new Map<string, BasePlugin>();
	// public importingCommand?: BaseCommand;

	/**
	 *
	 * @param framedClient
	 */
	constructor(public readonly framedClient: FramedClient) {}

	/**
	 * Loads the plugins
	 * @param options RequireAll options
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
			logger.error(`Plugin with id ${plugin.id} already exists!`);
			return;
		}

		this.plugins.set(plugin.id, plugin);

		// Load commands
		if (plugin.paths.commands) {
			plugin.loadCommandsIn({
				dirname: plugin.paths.commands,
				filter: /^(.*)\.(js|ts)$/,
			});
		}

		// Load events
		if (plugin.paths.events) {
			plugin.loadEventsIn({
				dirname: plugin.paths.events,
				filter: /^(.*)\.(js|ts)$/,
			});
		}

		// plugin.importCommands(plugin.config.paths.commands);
		// plugin.importEvents(plugin.paths.events);
		logger.verbose(
			`Finished loading plugin ${plugin.name} v${plugin.version}.`
		);
	}

	get pluginsArray(): BasePlugin[] {
		return Array.from(this.plugins.values());
	}

	get commandsArray(): BaseCommand[] {
		const commands: BaseCommand[] = [];
		this.plugins.forEach(plugin => {
			commands.push(...Array.from(plugin.commands.values()));
		});
		return commands;
	}

	get prefixesArray(): string[] {
		const prefixes: string[] = [this.framedClient.defaultPrefix];

		// Goes through each plugin to get a prefix
		this.commandsArray.forEach(command => {
			if (command.prefix) {
				if (!prefixes.includes(command.prefix)) {
					prefixes.push(command.prefix);
				}
			}
		});

		// console.log("prefixes from pluginmanager.ts -> " + prefixes);
		return prefixes;
	}

	async runCommand(msg: FramedMessage): Promise<void> {
		if (msg.command) {
			const commandString = msg.command;
			const commandList: BaseCommand[] = [];
			this.plugins.forEach(element => {
				const cmd = element.commands.get(commandString);
				if (cmd && cmd.prefix == msg.prefix) {
					cmd.run(msg);
					commandList.push(cmd);
				} else {
					const alias = element.aliases.get(commandString);
					if (alias && alias.prefix == msg.prefix) {
						alias.run(msg);
						commandList.push(alias);
					}
				}
			});
		}
	}
}
