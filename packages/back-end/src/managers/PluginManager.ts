import util from "util";
import { BasePlugin } from "../structures/BasePlugin";
import { logger } from "shared";
import FramedClient from "../structures/FramedClient";
import DiscordUtils from "../utils/discord/DiscordUtils";
import FramedMessage from "../structures/FramedMessage";
import { BaseCommand } from "../structures/BaseCommand";
import { BaseEvent } from "../structures/BaseEvent";
import Options from "../interfaces/RequireAllOptions";
import Command from "./database/entities/Command";

export default class PluginManager {
	/**
	 * The key is the plugin's full ID
	 */
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
	loadPluginsIn(options: Options): void {
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

	get defaultPrefixes(): string[] {
		const prefixes: string[] = [
			this.framedClient.defaultPrefix,
			`${this.framedClient.client.user}`,
			`<@!${this.framedClient.client.user?.id}>`,
		];

		// logger.debug(`PluginManager.ts: Default prefixes: ${prefixes}`);
		return prefixes;
	}

	get allPossiblePrefixes(): string[] {
		const prefixes = this.defaultPrefixes;
		// Adds to the list of potential prefixes
		this.commandsArray.forEach(command => {
			command.prefixes.forEach(element => {
				if (!prefixes.includes(element)) {
					prefixes.push(element);
				}
			});
		});
		// logger.debug(`PluginManager.ts: Prefixes: ${prefixes}`);
		return prefixes;
	}

	get eventsArray(): BaseEvent[] {
		const events: BaseEvent[] = [];
		this.plugins.forEach(plugin => {
			events.push(...plugin.events);
		});
		return events;
	}

	async runCommand(msg: FramedMessage): Promise<void> {
		if (msg.command && msg.prefix) {
			logger.warn(
				`PluginManager.ts: runCommand() - ${msg.prefix}${msg.command}`
			);

			// Removes undefined type
			const commandString = msg.command;
			const prefix = msg.prefix;

			const commandList: BaseCommand[] = [];

			// Runs commands through plugins
			for await (const pluginElement of this.plugins) {
				const plugin = pluginElement[1];
				// Gets a command from the plugin
				const command = plugin.commands.get(commandString);

				const defaultHasMatchingPrefix = this.defaultPrefixes.includes(
					prefix
				);
				const hasMatchingPrefix = this.allPossiblePrefixes.includes(
					prefix
				);

				// First tries to find the command from the command map
				if (command && hasMatchingPrefix) {
					// If the prefix matches by default,
					// or the command has it, run the command
					if (
						defaultHasMatchingPrefix ||
						command.prefixes.includes(prefix)
					) {
						try {
							await command.run(msg);
							commandList.push(command);
						} catch (error) {
							logger.error(error.stack);
						}
					}
				} else {
					// Tries to find the command from an alias
					const alias = plugin.aliases.get(commandString);
					if (alias && hasMatchingPrefix) {
						// If the prefix matches by default,
						// or the command has it, run the command
						if (
							defaultHasMatchingPrefix ||
							alias.prefixes.includes(prefix)
						) {
							alias.run(msg);
							commandList.push(alias);
						}
					}
				}
			}

			// Runs commands through database
			const dbCommand:
				| Command
				| undefined = await this.framedClient.databaseManager.findCommandInDatabase(
				msg.command,
				msg.prefix
			);

			if (dbCommand) {
				this.renderCommandFromDB(dbCommand, msg);
			}
		}
	}

	async renderCommandFromDB(
		dbCommand: Command,
		msg: FramedMessage
	): Promise<void> {
		const responseData = dbCommand.response.responseData;
		if (responseData) {
			for await (const data of responseData.list) {
				await msg.discord?.channel.send(data.content);
			}
		} else {
			logger.error(
				`PluginManager.ts: tried to output the response data, but there was none!`
			);
		}
	}

	static async showHelp(msg: FramedMessage, id: string): Promise<boolean> {
		if (msg.discord) {
			await msg.framedClient.pluginManager.runCommand(
				new FramedMessage({
					framedClient: msg.framedClient,
					content: `${msg.framedClient.defaultPrefix}help ${id}`,
					discord: {
						client: msg.discord.client,
						channel: msg.discord.channel,
						author: msg.discord.author,
						guild: msg.discord.guild,
					},
				})
			);
			return true;
		}

		return false;
	}
}
