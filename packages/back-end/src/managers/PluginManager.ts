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
import Discord from "discord.js";
import { DatabaseManager } from "./DatabaseManager";
import { oneLine } from "common-tags";
import * as TypeORM from "typeorm";

export interface HelpCategory {
	category: string;
	command: HelpInfo[];
}

export interface HelpInfo {
	command: string;
}

export interface HelpData {
	category: string;
	commands: string[];
}

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
				this.sendCommandFromDB(dbCommand, msg);
			}
		}
	}

	/**
	 * Sends a command from the database into chat.
	 *
	 * @param dbCommand Command entity
	 * @param msg Framed message object
	 */
	async sendCommandFromDB(
		dbCommand: Command,
		msg: FramedMessage
	): Promise<void> {
		const responseData = dbCommand.response.responseData;
		if (responseData) {
			for await (const data of responseData.list) {
				const embeds = data.discord?.embeds;
				let embed: Discord.MessageEmbed | undefined;
				if (embeds && embeds[0]) {
					embed = embeds[0];
				}
				if (embed) {
					await msg.discord?.channel.send(data.content, embed);
				} else {
					await msg.discord?.channel.send(data.content);
				}
			}
		} else {
			logger.error(
				`PluginManager.ts: tried to output the response data, but there was none!`
			);
		}
	}

	/**
	 * Sends a message showing help for a command.
	 *
	 * @param msg Framed message object
	 * @param id Command ID
	 */
	static async showHelpForCommand(
		msg: FramedMessage,
		id: string
	): Promise<boolean> {
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

	/**
	 * Creates Discord embed field data from plugin commands, showing commands.
	 *
	 * @param helpList Data to choose certain commands
	 *
	 * @returns Discord embed field data, containing brief info on commands
	 */
	async createHelpFields(
		helpList: HelpData[]
	): Promise<Discord.EmbedFieldData[] | undefined> {
		const connection = this.framedClient.databaseManager.connection;
		if (connection) {
			return await PluginManager.createHelpFields(
				this.plugins,
				helpList,
				connection
			);
		} else {
			return undefined;
		}
	}

	/**
	 * Creates Discord embed field data from plugin commands, showing commands.
	 *
	 * @param plugins A map of plugins. Usually, this should equal
	 * `this.plugins`. If you're not calling it statically, use the non-static `createMainHelpFields()`.
	 * @param helpList Data to choose certain commands
	 *
	 * @returns Discord embed field data, containing brief info on commands
	 */
	static async createMainHelpFields(
		plugins: Map<string, BasePlugin>,
		helpList: HelpCategory[],
		connection: TypeORM.Connection
	): Promise<Discord.EmbedFieldData[]> {
		const fields: Discord.EmbedFieldData[] = [];
		const sectionMap = new Map<string, string>();
		const commandRepo = connection.getRepository(Command);
		const databaseCommands = await commandRepo.find({
			relations: ["defaultPrefix", "response"],
		});

		// Loops through all of the help elements,
		// in order to find the right data
		for await (const helpElement of helpList) {
			// Searches through plugins
			plugins.forEach(plugin => {
				// Combine both commands and aliases into one variable
				const pluginCommands = Array.from(plugin.commands.values());
				const pluginAliases = Array.from(plugin.aliases.values());
				const allComamndsAliases = pluginCommands.concat(pluginAliases);

				// Searches through commands inside the plugins
				allComamndsAliases.forEach(command => {
					// Searches through command text options
					helpElement.command.forEach(cmdElement => {
						// If there's a matching command or alias,
						// add it to the Map for processing later
						if (
							command.id == cmdElement.command ||
							command.aliases?.includes(cmdElement.command)
						) {
							const usage =
								command.usage && !command.hideUsageInHelp
									? ` ${command.usage}`
									: "";

							sectionMap.set(
								cmdElement.command,
								oneLine`
								\`${command.defaultPrefix}${command.id}${usage}\`
								- ${command.about}
							`
							);
						}
					});
				});
			});

			// Searches through database
			for await (const command of databaseCommands) {
				let content = `\`${command.defaultPrefix.prefix}${command.id}\``;
				const description = command.response?.responseData?.description;

				if (description) {
					content = `${content} - ${description}\n`;
				} else {
					content += ` `;
				}

				sectionMap.set(command.id, content);
			}
		}

		// Loops through all of the help elements,
		// in order to sort them properly like in the data
		helpList.forEach(helpElement => {
			let text = "";

			// Goes through each command in help, and finds matches in order
			helpElement.command.forEach(cmdElement => {
				const cmdText = sectionMap.get(cmdElement.command);
				if (cmdText) {
					text += `${cmdText}\n`;
				}
			});

			// Push everything from this category into a Embed field
			fields.push({
				name: helpElement.category,
				value: text,
			});
		});

		return fields;
	}

	/**
	 * @param plugins A map of plugins. Usually, this should equal
	 * `this.plugins`. If you're not calling it statically, use the non-static `createMainHelpFields()`.
	 * @param helpList Data to choose certain commands
	 */
	static async createHelpFields(
		plugins: Map<string, BasePlugin>,
		helpList: HelpData[],
		connection: TypeORM.Connection
	): Promise<Discord.EmbedFieldData[]> {
		const fields: Discord.EmbedFieldData[] = [];
		const entries = new Map<
			string,
			{ description: string; category: string }
		>();
		const commandRepo = connection.getRepository(Command);
		const databaseCommands = await commandRepo.find({
			relations: ["defaultPrefix", "response"],
		});

		const categoryIconMap = new Map<string, string>();
		const pluginCommandMap = new Map<string, BaseCommand[]>();

		plugins.forEach(plugin => {
			// Combine both commands and aliases into one variable
			const pluginCommands = Array.from(plugin.commands.values());

			// Set them all into the map
			pluginCommandMap.set(plugin.id, pluginCommands);
		});

		// Goes through all of the help elements, and assigns something to print out
		for await (const helpElement of helpList) {
			for await (const command of helpElement.commands) {
				// Gets all plugin command and alias references, along
				// with exhausting all possible categories
				pluginCommandMap.forEach(element => {
					element.forEach(baseCommand => {
						// Category
						if (baseCommand.category)
							categoryIconMap.set(
								baseCommand.category,
								baseCommand.emojiIcon
									? baseCommand.emojiIcon
									: "❔"
							);

						// If there's a matching command or alias,
						if (
							baseCommand.id == command ||
							baseCommand.aliases?.includes(command)
						) {
							const usage =
								baseCommand.usage &&
								!baseCommand.hideUsageInHelp
									? ` ${baseCommand.usage}`
									: "";
							entries.set(command, {
								category: baseCommand.category
									? baseCommand.category
									: "Other",
								description: `\`${baseCommand.defaultPrefix}${baseCommand.id}${usage}\` - ${baseCommand.about}`,
							});
						}
					});
				});

				// Searches through database
				for await (const command of databaseCommands) {
					let content = `\`${command.defaultPrefix.prefix}${command.id}\``;
					const description =
						command.response?.responseData?.description;

					if (description) {
						content = `${content} - ${description}\n`;
					} else {
						content += ` `;
					}

					entries.set(command.id, {
						category: "",
						description: content,
					});
				}
			}
		}

		// 

		// Loops through all of the help elements,
		// in order to sort them properly like in the data
		helpList.forEach(helpElement => {
			let categoryText = "";

			// Goes through each command in help, and finds matches in order
			helpElement.commands.forEach(command => {
				const text = entries.get(command);
				if (text) {
					categoryText += `${text.description}\n`;
				}
			});

			// Push everything from this category into a Embed field
			fields.push({
				name: helpElement.category,
				value: categoryText,
			});
		});

		return fields;
	}

	/**
	 * Create embed field data on all of the commands in the database.
	 *
	 * @returns Discord embed field data
	 */
	async createInfoHelpFields(): Promise<
		Discord.EmbedFieldData[] | undefined
	> {
		return PluginManager.createDBHelpFields(
			this.framedClient.databaseManager
		);
	}

	/**
	 * Create embed field data on all of the commands in the database.
	 *
	 * @param databaseManager Database Manager
	 *
	 * @returns Discord embed field data
	 */
	static async createDBHelpFields(
		databaseManager: DatabaseManager
	): Promise<Discord.EmbedFieldData[] | undefined> {
		const connection = databaseManager.connection;
		if (connection) {
			const fields: Discord.EmbedFieldData[] = [];
			const commandRepo = connection.getRepository(Command);
			const commands = await commandRepo.find({
				relations: ["defaultPrefix", "response"],
			});

			const contentNoDescriptionList: string[] = [];
			const contentList: string[] = [];

			for await (const command of commands) {
				let content = `\`${command.defaultPrefix.prefix}${command.id}\``;
				const description = command.response?.responseData?.description;

				if (description) {
					content = `${content} - ${description}\n`;
					contentList.push(content);
				} else {
					content += ` `;
					contentNoDescriptionList.push(content);
				}
			}

			let content = "";
			contentNoDescriptionList.forEach(element => {
				content += element;
			});

			if (content.length > 0) {
				content += "\n";
			}

			contentList.forEach(element => {
				content += element;
			});

			if (content.length > 0) {
				fields.push({
					name: "Other",
					value: content,
				});
				return fields;
			} else {
				return undefined;
			}
		}
		return undefined;
	}
}
