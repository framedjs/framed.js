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
import DatabaseManager from "./DatabaseManager";
import { oneLine, oneLineInlineLists } from "common-tags";
import * as TypeORM from "typeorm";
import { FriendlyError } from "../structures/errors/FriendlyError";
import EmbedHelper from "../utils/discord/EmbedHelper";

export interface HelpGroup {
	group: string;
	command: HelpInfo[];
}

export interface HelpInfo {
	command: string;
}

export interface HelpData {
	group: string;
	commands: string[];
}

export default class PluginManager {
	/**
	 * The key is the plugin's full ID
	 */
	public map = new Map<string, BasePlugin>();
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
	loadPluginsIn(options: Options): BasePlugin[] {
		const plugins = DiscordUtils.importScripts(options) as (new (
			framedClient: FramedClient
		) => BasePlugin)[];
		logger.silly(`Plugins: ${util.inspect(plugins)}`);
		return this.loadPlugins(plugins);
	}

	/**
	 * Loads plugins
	 * @param plugins
	 */
	loadPlugins<T extends BasePlugin>(
		plugins: (new (framedClient: FramedClient) => T)[]
	): BasePlugin[] {
		const pluginArray: BasePlugin[] = [];
		for (const plugin of plugins) {
			const initPlugin = new plugin(this.framedClient);
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
			logger.error(`Plugin with id ${plugin.id} already exists!`);
			return;
		}

		this.map.set(plugin.id, plugin);

		// Load commands
		// TODO: excluding subcommands doesn't work
		if (plugin.paths.commands) {
			const importFilter = this.framedClient.importFilter;
			plugin.loadCommandsIn({
				dirname: plugin.paths.commands,
				// filter: importFilter,
				filter: fileName => {
					const success = importFilter.test(fileName);
					return success ? fileName : false;
				},
				excludeDirs: /^(.*)\.(git|svn)$|^(.*)subcommands(.*)$/,
			});
		}

		// Load events
		if (plugin.paths.events) {
			plugin.loadEventsIn({
				dirname: plugin.paths.events,
				filter: this.framedClient.importFilter,
				excludeDirs: /^(.*)\.(git|svn)$|^(.*)subcommands(.*)$/,
			});
		}

		if (plugin.paths.routes) {
			this.framedClient.api.loadRoutesIn({
				dirname: plugin.paths.routes,
				filter: this.framedClient.importFilter,
				// excludeDirs: /^(.*)\.(git|svn)$|^(.*)subcommands(.*)$/,
			});
		}

		logger.verbose(
			`Finished loading plugin ${plugin.name} v${plugin.version}.`
		);
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
	 * List of all the default prefixes
	 * @returns String array of default prefixes
	 */
	get defaultPrefixes(): string[] {
		const prefixes: string[] = [
			this.framedClient.defaultPrefix,
			`<@!${this.framedClient.discord.client?.user?.id}>`,
		];

		// logger.debug(`PluginManager.ts: Default prefixes: ${prefixes}`);
		return prefixes;
	}

	/**
	 * List of all possible prefixes
	 * @returns String array of all possible prefixes
	 */
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

	getCommand(command: string, prefix?: string): BaseCommand | undefined;
	getCommand(msg: FramedMessage): BaseCommand | undefined;

	getCommand(
		msgOrCommand: FramedMessage | string,
		prefix?: string
	): BaseCommand | undefined {
		return this.internalGetCommands(msgOrCommand, prefix, true)[0];
	}

	/**
	 * Get a list of plugin commands from a message.
	 * This function will also get a comand's alias.
	 *
	 * Optimally, there should be only one command but will allow
	 * overlapping commands from different plugins.
	 *
	 * @param command Command ID
	 * @param prefix Prefix
	 *
	 * @returns List of commands with the same ID.
	 */
	getCommands(command: string, prefix?: string): BaseCommand[];

	/**
	 * Get a list of plugin commands from a message.
	 * This function will also get a comand's alias.
	 *
	 * Optimally, there should be only one command but will allow
	 * overlapping commands from different plugins.
	 *
	 * @param msg Framed message
	 *
	 * @returns List of commands with the same ID.
	 */
	getCommands(msg: FramedMessage): BaseCommand[];

	getCommands(
		msgOrCommand: FramedMessage | string,
		prefix?: string
	): BaseCommand[] {
		return this.internalGetCommands(msgOrCommand, prefix);
	}

	// getSubcommand(command: string): BaseSubcommand | undefined;

	// getSubcommand(
	// 	plugin: PluginResolvable,
	// 	command: string
	// ): BaseSubcommand | undefined;

	// getSubcommand(
	// 	commandOrPlugin: string | PluginResolvable,
	// 	command?: string
	// ) {}

	/**
	 * Internal get commands function to reduce code duplication.
	 *
	 * Intentionally only gives commands for subcommand inputs.
	 */
	private internalGetCommands(
		msgOrCommand: FramedMessage | string,
		prefix?: string,
		findOne?: boolean
	): BaseCommand[] {
		const commandList: BaseCommand[] = [];

		let commandString: string;

		if (msgOrCommand instanceof FramedMessage && msgOrCommand.command) {
			commandString = msgOrCommand.command;
		} else if (typeof msgOrCommand == "string") {
			commandString = msgOrCommand;
		} else {
			return commandList;
		}

		// If the command string isn't referencing an ID
		if (commandString.indexOf(".") == -1) {
			// Tries to the find the command in plugins
			for (const pluginElement of this.map) {
				const plugin = pluginElement[1];
				let command = plugin.commands.get(commandString);

				if (!command) {
					// Tries to find the command from an alias
					command = plugin.aliases.get(commandString);
				}

				if (command) {
					// If the prefix matches by default, or the command has it,
					// OR there is no specified prefix to match against, push
					if (
						(prefix &&
							(this.defaultPrefixes.includes(prefix) ||
								command.prefixes.includes(prefix))) ||
						!prefix
					) {
						if (!findOne) commandList.push(command);
						else return [command];
					}
				}
			}
		} else {
			// It's an ID, so we should search for it.
			const commandStringArgs = commandString.split(".");
			if (commandStringArgs.length < 5) {
				return [];
			}

			const clone = [...commandStringArgs];
			const pluginId = clone.splice(0, 3).join(".");

			// Removes the command identifier from x.x.x.command.x
			clone.shift();

			const plugin = this.map.get(pluginId);
			if (!plugin) return [];

			let command = plugin.commands.get(clone[0]);
			if (!command) {
				command = plugin.aliases.get(clone[0]);
				if (!command) {
					return [];
				}
			}

			return [command];
		}

		return commandList;
	}

	/**
	 * Runs a command, based on the FramedMessage parameters
	 * @param msg FramedMessage object
	 */
	async runCommand(msg: FramedMessage): Promise<Map<string, boolean>> {
		const map = new Map<string, boolean>();

		// If the author is a bot, we ignore their command.
		/*
		 * This is to patch any security exploits, such as using the Raw.ts command
		 * to print out a plain message that contains a comamnd. Then, the command will
		 * run with elevated permissions, as the bot likely has higher permissions than the user.
		 */
		if (msg.discord?.author.bot) {
			return map;
		}

		try {
			if (msg.command && msg.prefix) {
				logger.debug(
					`PluginManager.ts: runCommand() - ${msg.prefix}${msg.command}`
				);

				// Runs the commands
				const commandList = this.getCommands(msg);
				for await (const command of commandList) {
					// Gets the base command's prefixes or default prefixes, and see if they match.
					// Subcommands are not allowed to declare new prefixes.
					if (
						command.prefixes.includes(msg.prefix) ||
						this.defaultPrefixes.includes(msg.prefix)
					) {
						// Attempts to get the subcommand if it exists.
						// If not, use the base command.
						let tempCommand = command;
						if (msg.args) {
							const subcommand = command.getSubcommand(msg.args);
							tempCommand = subcommand ? subcommand : command;
						}

						// Attempts to run the command
						try {
							const success = await tempCommand.run(msg);
							map.set(tempCommand.fullId, success);
						} catch (error) {
							if (error instanceof FriendlyError) {
								logger.warn(oneLine`
								A Friendly Error occured! Likely, this warning is
								safe to ignore, unless it's needed for debug purposes.`);
								logger.warn(error.stack);

								await PluginManager.sendErrorMessage(
									msg,
									error
								);
							} else {
								logger.error(error.stack);
							}
						}
					}
				}

				// Attempts to runs commands through database
				const dbCommand:
					| Command
					| undefined = await this.framedClient.database.findCommand(
					msg.command,
					msg.prefix
				);

				if (dbCommand) {
					const success = await this.sendCommandFromDB(
						dbCommand,
						msg
					);
					map.set(dbCommand.id, success);
				}
			}
		} catch (error) {
			logger.error(error.stack);
		}

		return map;
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
	): Promise<boolean> {
		const responseData = dbCommand.response.responseData;
		if (responseData) {
			const discordEmbedsExist = responseData.list.some(
				data => data.discord?.embeds != undefined
			);

			if (msg.twitch) {
				if (discordEmbedsExist) {
					return false;
				}
			}

			if (msg.discord) {
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
					return true;
				}
			} else {
				for await (const data of responseData.list) {
					await msg.send(data.content);
				}
			}
		} else {
			logger.error(
				`PluginManager.ts: tried to output the response data, but there was none!`
			);
		}
		return false;
	}

	/**
	 * Sends a message showing help for a command.
	 *
	 * @param msg Framed message object
	 * @param id Command ID
	 *
	 * @returns boolean value `true` if help is shown.
	 */
	static async sendHelpForCommand(msg: FramedMessage): Promise<boolean> {
		const pluginManager = msg.framedClient.plugins;

		const helpPrefix = pluginManager.map
			.get("default.bot.info")
			?.commands.get("help")?.defaultPrefix;

		const content = oneLineInlineLists`${
			helpPrefix ? helpPrefix : msg.prefix
		}help ${msg.command} ${msg.args ? msg.args : ""}`;

		if (msg.discord) {
			await msg.framedClient.plugins.runCommand(
				new FramedMessage({
					framedClient: msg.framedClient,
					content: content,
					discord: {
						client: msg.discord.client,
						channel: msg.discord.channel,
						author: msg.discord.author,
						guild: msg.discord.guild,
					},
				})
			);
			return true;
		} else if (msg.twitch) {
			await msg.framedClient.plugins.runCommand(
				new FramedMessage({
					framedClient: msg.framedClient,
					content: content,
					twitch: {
						chatClient: msg.twitch.chatClient,
						channel: msg.twitch.channel,
						user: msg.twitch.user,
					},
				})
			);
		}

		return false;
	}

	/**
	 * Sends error message
	 *
	 * @param commandId Command ID for EmbedHelper.getTemplate
	 */
	static async sendErrorMessage(
		msg: FramedMessage,
		friendlyError: FriendlyError,
		commandId?: string
	): Promise<void> {
		if (msg.discord) {
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				msg.framedClient.helpCommands,
				commandId
			)
				.setTitle(friendlyError.friendlyName)
				.setDescription(friendlyError.message);

			await msg.discord.channel.send(embed);
		} else {
			await msg.send(
				`${friendlyError.friendlyName}: ${friendlyError.message}`
			);
		}
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
		const connection = this.framedClient.database.connection;
		if (connection) {
			return await PluginManager.createHelpFields(
				this.map,
				helpList,
				connection
			);
		} else {
			return undefined;
		}
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
			{ description: string; group: string; small: boolean }
		>();
		const commandRepo = connection.getRepository(Command);
		const databaseCommands = await commandRepo.find({
			relations: ["defaultPrefix", "response", "group"],
		});

		const groupIconMap = new Map<string, string>();
		const pluginCommandMap = new Map<string, BaseCommand[]>();

		plugins.forEach(plugin => {
			// Combine both commands and aliases into one variable
			const pluginCommands = Array.from(plugin.commands.values());

			// Set them all into the map
			pluginCommandMap.set(plugin.id, pluginCommands);
		});

		// Goes through all of the help elements, and assigns something to print out
		for (const helpElement of helpList) {
			// Check in each command in array
			for await (const command of helpElement.commands) {
				// Gets all plugin command and alias references, along
				// with exhausting all possible categories
				for await (const element of pluginCommandMap) {
					const baseCommands = element[1];
					for await (const baseCommand of baseCommands) {
						// Group
						groupIconMap.set(
							baseCommand.group,
							baseCommand.groupEmote
								? baseCommand.groupEmote
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
							const about = baseCommand.about
								? ` - ${baseCommand.about}\n`
								: " ";
							entries.set(command, {
								group: baseCommand.groupEmote
									? baseCommand.groupEmote
									: "Unknown",
								description: `\`${baseCommand.defaultPrefix}${baseCommand.id}${usage}\`${about}`,
								small: baseCommand.about != undefined,
							});
						}
					}
				}

				// Searches through database
				for (const command of databaseCommands) {
					let content = `\`${command.defaultPrefix.prefix}${command.id}\``;
					let small = false;

					const description = command.response?.description;

					if (description) {
						content = `${content} - ${description}\n`;
					} else {
						content += ` `;
						small = true;
					}

					const group = command.group.name;
					const emote = command.group.emote
						? command.group.emote
						: "❔";

					groupIconMap.set(group, emote);

					entries.set(command.id, {
						group: group,
						description: content,
						small,
					});
				}
			}
		}

		// Clones arrays to get a new help list, and a list of unparsed commands.
		const clonedHelpList: HelpData[] = JSON.parse(JSON.stringify(helpList));
		const unparsedCommands: Command[] = [...databaseCommands];

		// Goes through the new help list to add database commands
		clonedHelpList.forEach(helpElement => {
			databaseCommands.forEach(command => {
				const groupName = command.group.name;

				if (groupName) {
					// If there's a matching group, add it to the list
					if (helpElement.group == groupName) {
						helpElement.commands.push(command.id);

						// Remove the parsed command from the unparsed command list
						unparsedCommands.splice(
							unparsedCommands.indexOf(command),
							1
						);
					}
				}
			});
		});

		// Put all unparsed commands that didn't have any matching group to
		// be in the Other group. Then, if there is any new data, push it in.
		const newHelpData: HelpData[] = [];
		unparsedCommands.forEach(command => {
			const matchingHelpData = newHelpData.find(
				data => data.group == command.group.name
			);

			if (!matchingHelpData) {
				const data: HelpData = {
					group: command.group.name,
					commands: [command.id],
				};
				newHelpData.push(data);
			} else {
				matchingHelpData.commands.push(command.id);
			}
		});
		clonedHelpList.push(...newHelpData);

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

	/**
	 * Create embed field data on all of the commands in the database.
	 *
	 * @returns Discord embed field data
	 */
	async createInfoHelpFields(): Promise<
		Discord.EmbedFieldData[] | undefined
	> {
		return PluginManager.createDBHelpFields(this.framedClient.database);
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
				const description = command.response?.description;

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
