import { Logger } from "@framedjs/logger";
import Discord from "discord.js";
import util from "util";

import { BaseCommand } from "../structures/BaseCommand";
import { BaseDiscordInteraction } from "../structures/BaseDiscordInteraction";
import { BaseEvent } from "../structures/BaseEvent";
import { BasePlugin } from "../structures/BasePlugin";
import { Client } from "../structures/Client";
import { BaseMessage } from "../structures/BaseMessage";

import { HelpData } from "../interfaces/other/HelpData";
import Options from "../interfaces/other/RequireAllOptions";

import { DiscordUtils } from "../utils/discord/DiscordUtils";
import { Place } from "../interfaces/Place";
import { Base } from "../structures/Base";

export class PluginManager extends Base {
	/**
	 * The key is the plugin's full ID
	 */
	map = new Map<string, BasePlugin>();
	// importingCommand?: BaseCommand;

	/**
	 *
	 * @param client
	 */
	constructor(client: Client) {
		super(client);
	}

	/**
	 * Loads the plugins
	 * @param options RequireAll options
	 */
	loadPluginsIn(options: Options): BasePlugin[] {
		const plugins = DiscordUtils.importScripts(options) as (new (
			client: Client
		) => BasePlugin)[];
		Logger.silly(`Plugins: ${util.inspect(plugins)}`);
		return this.loadPlugins(plugins);
	}

	/**
	 * Loads plugins
	 * @param plugins
	 */
	loadPlugins<T extends BasePlugin>(
		plugins: (new (client: Client) => T)[]
	): BasePlugin[] {
		const pluginArray: BasePlugin[] = [];
		for (const plugin of plugins) {
			const initPlugin = new plugin(this.client);
			const loadedPlugin = this.loadPlugin(initPlugin);
			if (loadedPlugin) pluginArray.push(loadedPlugin);
		}
		return pluginArray;
	}

	/**
	 * Loads plugin
	 * @param plugin
	 */
	loadPlugin<T extends BasePlugin>(plugin: T): BasePlugin | undefined {
		if (this.map.get(plugin.id)) {
			Logger.error(`Plugin with id ${plugin.id} already exists!`);
			return;
		}

		this.map.set(plugin.id, plugin);

		const importFilter = this.client.importFilter;

		// Load commands
		// TODO: excluding subcommands doesn't work
		if (plugin.paths.commands) {
			plugin.loadCommandsIn({
				dirname: plugin.paths.commands,
				filter: fileName => {
					const success = importFilter.test(fileName);
					return success ? fileName : false;
				},
			});
		}

		// Load events
		if (plugin.paths.events) {
			plugin.loadEventsIn({
				dirname: plugin.paths.events,
				filter: fileName => {
					const success = importFilter.test(fileName);
					return success ? fileName : false;
				},
			});
		}

		// Load Discord interactions
		if (plugin.paths.discordInteractions) {
			plugin.loadDiscordInteractionsIn({
				dirname: plugin.paths.discordInteractions,
				filter: fileName => {
					const success = importFilter.test(fileName);
					return success ? fileName : false;
				},
			});
		}

		if (plugin.paths.routes) {
			this.client.api?.loadRoutesIn({
				dirname: plugin.paths.routes,
				filter: fileName => {
					const success = importFilter.test(fileName);
					return success ? fileName : false;
				},
			});
		}

		Logger.verbose(`Loaded plugin ${plugin.name} v${plugin.version}`);
		return plugin;
	}

	/**
	 * BasePlugin array
	 * @returns List of all plugins imported
	 */
	get pluginsArray(): BasePlugin[] {
		return Array.from(this.map.values());
	}

	/**
	 * BaseCommand array
	 * @returns List of all the base commands from all plugins
	 */
	get commandsArray(): BaseCommand[] {
		const commands: BaseCommand[] = [];
		this.map.forEach(plugin => {
			commands.push(...Array.from(plugin.commands.values()));
		});
		return commands;
	}

	/**
	 * BaseEvent array
	 * @returns List of all the base arrays from all plugins
	 */
	get eventsArray(): BaseEvent[] {
		const events: BaseEvent[] = [];
		this.map.forEach(plugin => {
			events.push(...Array.from(plugin.events.values()));
		});
		return events;
	}

	/**
	 * BaseDiscordInteraction array.
	 * @returns List of all the base Discord interactions,
	 * excluding slash commands.
	 */
	get discordInteractionsArray(): BaseDiscordInteraction[] {
		const discordInteractions: BaseDiscordInteraction[] = [];
		this.map.forEach(plugin => {
			discordInteractions.push(
				...Array.from(plugin.discordInteractions.values())
			);
		});
		return discordInteractions;
	}

	/**
	 * Creates Discord embed field data from plugin commands, showing commands.
	 *
	 * @param helpList Data to choose certain commands
	 * @param place Place data
	 *
	 * @returns Discord embed field data, containing brief info on commands
	 */
	async createHelpFields(
		helpList: HelpData[],
		place: Place
	): Promise<Discord.EmbedFieldData[]> {
		const fields: Discord.EmbedFieldData[] = [];
		const entries = new Map<
			/** Command ID */
			string,
			{
				description: string;
				group: string;
				small: boolean;
			}
		>();

		const groupIconMap = new Map<string, string>();
		const pluginCommandMap = new Map<string, BaseCommand[]>();

		// Combine both commands and aliases into one variable
		// Then, set them all into the map
		this.client.plugins.map.forEach(plugin => {
			const pluginCommands = Array.from(plugin.commands.values());
			pluginCommandMap.set(plugin.id, pluginCommands);
		});

		// Gets all plugin command and alias references, along
		// with exhausting all possible categories
		for (const baseCommands of pluginCommandMap.values()) {
			// Gets all the groups and their icons
			for (const baseCommand of baseCommands) {
				groupIconMap.set(
					baseCommand.group,
					baseCommand.groupEmote ? baseCommand.groupEmote : "❔"
				);
			}

			// Goes through all of the help elements
			for (const helpElement of helpList) {
				// Check in each command in array
				for (const commandElement of helpElement.commands) {
					const args = BaseMessage.getArgs(commandElement);
					const command = args.shift();

					if (command == undefined) {
						throw new Error("command is null or undefined");
					}

					const foundData = (
						await this.client.commands.getFoundCommandData(
							command,
							args,
							place
						)
					)[0];

					// If there's a command found,
					if (foundData) {
						const commandString =
							this.client.formatting.getCommandRan(
								foundData,
								place
							);
						const lastSubcommand =
							foundData.subcommands[
								foundData.subcommands.length - 1
							];
						const baseCommand = lastSubcommand
							? lastSubcommand
							: foundData.command;

						const usage =
							baseCommand.usage && !baseCommand.hideUsageInHelp
								? ` ${baseCommand.usage}`
								: "";
						const about = baseCommand.about
							? ` - ${baseCommand.about}\n`
							: " ";
						entries.set(commandElement, {
							group: baseCommand.groupEmote
								? baseCommand.groupEmote
								: "Unknown",
							description: `\`${commandString}${usage}\`${about}`,
							small: baseCommand.about != undefined,
						});
					}
				}
			}
		}

		// Clones arrays to get a new help list, and a list of unparsed commands.
		const clonedHelpList: HelpData[] = JSON.parse(JSON.stringify(helpList));

		// Loops through all of the help elements,
		// in order to sort them properly like in the data
		for (let i = 0; i < clonedHelpList.length; i++) {
			const helpElement = clonedHelpList[i];

			let description = "";
			let smallCommands = "";
			let icon = groupIconMap.get(helpElement.group);

			if (!icon) {
				icon = groupIconMap.get("Other");
				if (!icon) {
					icon = "❔";
				}
			}

			// Goes through each command in help, and finds matches in order
			helpElement.commands.forEach(command => {
				const text = entries.get(command);
				if (text) {
					if (!text.small) {
						description += `${text.description}`;
					} else {
						smallCommands += `${text.description}`;
					}
				}
			});

			// Push everything from this group into a Embed field
			fields.push({
				name: `${icon} ${helpElement.group}`,
				value: `${description}${smallCommands}`,
			});
		}

		return fields;
	}
}
