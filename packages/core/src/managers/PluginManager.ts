import { Logger } from "@framedjs/logger";
import { oneLine, oneLineInlineLists } from "common-tags";
import Discord from "discord.js";
import util from "util";

import { BaseCommand } from "../structures/BaseCommand";
import { BaseEvent } from "../structures/BaseEvent";
import { BasePlugin } from "../structures/BasePlugin";
import { Client } from "../structures/Client";
import { FriendlyError } from "../structures/errors/FriendlyError";
import { Message } from "../structures/Message";

import { FoundCommandData } from "../interfaces/FoundCommandData";
import { HelpData } from "../interfaces/other/HelpData";
import Options from "../interfaces/other/RequireAllOptions";

import { DatabaseManager } from "./DatabaseManager";
import Command from "./database/entities/Command";

import { DiscordUtils } from "../utils/discord/DiscordUtils";
import { EmbedHelper } from "../utils/discord/EmbedHelper";
import { Place } from "../interfaces/Place";
import Prefix from "./database/entities/Prefix";

export class PluginManager {
	/**
	 * The key is the plugin's full ID
	 */
	map = new Map<string, BasePlugin>();
	// importingCommand?: BaseCommand;

	/**
	 *
	 * @param client
	 */
	constructor(readonly client: Client) {}

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

		if (plugin.paths.routes) {
			this.client.api.loadRoutesIn({
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
	 * List of all the default prefixes
	 * @returns String array of default prefixes
	 */
	get defaultPrefixes(): string[] {
		const prefixes: string[] = [
			`<@!${this.client.discord.client?.user?.id}>`,
			`<@${this.client.discord.client?.user?.id}>`,
		];

		// Logger.debug(`Default prefixes: ${prefixes}`);
		return prefixes;
	}

	/**
	 * List of all possible prefixes for the specific guild or Twitch channel.
	 *
	 * @param place Place data
	 *
	 * @returns String array of all possible prefixes
	 */
	getPossiblePrefixes(place: Place): string[] {
		const prefixes = this.defaultPrefixes;

		// // From client: adds defaults to the list of potential prefixes
		// if (place == "default") {
		// 	prefixes.push(this.client.defaultPrefix);
		// } else if (place == "discord_default") {
		// 	prefixes.push(this.client.discord.defaultPrefix);
		// } else if (place == "twitch_default") {
		// 	prefixes.push(this.client.twitch.defaultPrefix);
		// }

		// From commands: adds to the list of potential prefixes (also removes duplicates)
		for (const command of this.commandsArray) {
			const commandPrefixes = command.getPrefixes(place);
			for (const prefix of commandPrefixes) {
				if (!prefixes.includes(prefix)) {
					prefixes.push(prefix);
				}
			}
		}

		Logger.silly(`Prefixes: ${prefixes}`);
		return prefixes;
	}

	//#region Getting commands

	/**
	 *
	 * @param msg Framed message
	 */
	async getFoundCommandData(
		msg: Message,
		place: Place
	): Promise<FoundCommandData[]>;

	/**
	 *
	 * @param prefix
	 * @param command
	 * @param args
	 */
	async getFoundCommandData(
		command: string,
		args: string[],
		place: Place,
		prefix?: string
	): Promise<FoundCommandData[]>;

	/**
	 *
	 * @param msgOrCommand
	 * @param args
	 * @param prefix
	 */
	async getFoundCommandData(
		msgOrCommand: Message | string,
		argsOrPlace?: string[] | Place,
		place?: Place,
		prefix?: string
	): Promise<FoundCommandData[]> {
		let command: string;
		let args: string[];

		if (msgOrCommand instanceof Message) {
			if (msgOrCommand.command) {
				prefix = msgOrCommand.prefix;
				command = msgOrCommand.command;
				args = msgOrCommand.args ? msgOrCommand.args : [];
				place = place ? place : await msgOrCommand.getPlace();
			} else {
				throw new Error(`Command parameter in Message was undefined`);
			}
		} else {
			if (!(argsOrPlace instanceof Array)) {
				throw new Error(
					`argsOrPlace must be an Array, if msgOrComamnd is a string`
				);
			}

			command = msgOrCommand;
			args = argsOrPlace;

			if (!place) {
				throw new ReferenceError("Variable place is undefined");
			}
		}

		const data: FoundCommandData[] = [];

		// Runs the commands
		let commandList: BaseCommand[] = [];
		if (msgOrCommand instanceof Message) {
			commandList = this.getCommands(msgOrCommand, place);
		} else {
			commandList = this.getCommands(command, place, prefix);
		}

		for (const command of commandList) {
			const element: FoundCommandData = {
				command: command,
				subcommands: [],
			};

			element.subcommands = command.getSubcommandChain(args);
			data.push(element);
		}

		return data;
	}

	/**
	 * Gets a command
	 *
	 * @param command Command ID
	 * @param place Place data
	 * @param prefix Prefix
	 *
	 * @returns BaseCommand or undefined
	 */
	getCommand(
		command: string,
		place: Place,
		prefix?: string
	): BaseCommand | undefined;

	/**
	 * Gets a command
	 *
	 * @param msg Framed Message
	 * @param place Place data
	 *
	 * @returns BaseCommand or undefined
	 */
	getCommand(msg: Message, place: Place): BaseCommand | undefined;

	/**
	 * Gets a command
	 *
	 * @param msgOrCommand Framed Message or command string
	 * @param place Place data
	 * @param prefix Prefix
	 *
	 * @returns BaseCommand or undefined
	 */
	getCommand(
		msgOrCommand: Message | string,
		place: Place,
		prefix?: string
	): BaseCommand | undefined {
		if (msgOrCommand instanceof Message) {
			return this.getCommands(msgOrCommand, place)[0];
		} else {
			return this.getCommands(msgOrCommand, place, prefix)[0];
		}
	}

	/**
	 * Get a list of plugin commands from a message.
	 * This function will also get from a command's alias.
	 *
	 * Optimally, there should be only one command but will allow
	 * overlapping commands from different plugins.
	 *
	 * @param command Command ID
	 * @param place Place data
	 * @param prefix Prefix
	 *
	 * @returns List of commands with the same ID.
	 */
	getCommands(command: string, place: Place, prefix?: string): BaseCommand[];

	/**
	 * Get a list of plugin commands from a message.
	 * This function will also get from a command's alias.
	 *
	 * Optimally, there should be only one command but will allow
	 * overlapping commands from different plugins.
	 *
	 * @param msg Framed message
	 * @param place Place data
	 *
	 * @returns List of commands with the same ID.
	 */
	getCommands(msg: Message, place: Place): BaseCommand[];

	/**
	 * Get a list of plugin commands from a message.
	 * This function will also get from a command's alias.
	 *
	 * Optimally, there should be only one command but will allow
	 * overlapping commands from different plugins.
	 *
	 * @param msgOrCommand Framed Message or command
	 * @param place Place data
	 * @param prefix Prefix string
	 *
	 * @returns List of commands with the same ID.
	 */
	getCommands(
		msgOrCommand: Message | string,
		place: Place,
		prefix?: string
	): BaseCommand[] {
		const commandList: BaseCommand[] = [];

		let commandString: string;

		if (msgOrCommand instanceof Message) {
			if (msgOrCommand.command) {
				prefix = msgOrCommand.prefix;
				commandString = msgOrCommand.command;
			} else {
				throw new Error(`Command parameter in Message was undefined`);
			}
		} else if (typeof msgOrCommand == "string") {
			commandString = msgOrCommand;
		} else {
			return commandList;
		}

		// Tries to the find the command in plugins
		for (const pluginElement of this.map) {
			const plugin = pluginElement[1];
			let command = plugin.commands.get(commandString);

			if (!command) {
				// Tries to find the command from an alias
				command = plugin.aliases.get(commandString);
			}

			if (command) {
				const commandUsesPrefix =
					prefix != undefined &&
					command.getPrefixes(place).includes(prefix);

				const commandUsesDefaultPrefix =
					prefix != undefined &&
					this.defaultPrefixes.includes(prefix);

				// Gets the base command's prefixes or default prefixes, and see if they match.
				// Subcommands are not allowed to declare new prefixes.
				// If there was no prefix defined, ignore prefix checks.
				if (commandUsesPrefix || commandUsesDefaultPrefix || !prefix) {
					commandList.push(command);
				}
			}
		}

		return commandList;
	}

	//#endregion

	/**
	 * Runs a command, based on the Message parameters
	 * @param msg Message object
	 */
	async runCommand(msg: Message): Promise<Map<string, boolean>> {
		const place = await msg.getPlace();
		const map = new Map<string, boolean>();

		// If the author is a bot, we ignore their command.
		/*
		 * This is to patch any security exploits, such as using the Raw.ts command
		 * to print out a plain message that contains a comamnd. Then, the command will
		 * run with elevated permissions, as the bot likely has higher permissions than the user.
		 */
		if (msg.discord?.author.bot) {
			Logger.warn(
				`${msg.discord.author.tag} attempted to run a command, but was a bot!`
			);
			return map;
		}

		try {
			if (msg.prefix && msg.command) {
				Logger.debug(
					`Checking for commands for "${msg.prefix}${msg.command}"`
				);

				// Attempts to get the command data from a message, including comparing prefixes
				const data = await this.getFoundCommandData(msg, place);

				for await (const element of data) {
					// Attempts to get the subcommand if it exists.
					// If not, use the base command.
					let tempCommand = element.command;
					if (element.subcommands.length > 0) {
						tempCommand =
							element.subcommands[element.subcommands.length - 1];
					}

					// Attempts to run it and sets the data
					try {
						const success = await tempCommand.run(msg);
						map.set(tempCommand.fullId, success);
					} catch (error) {
						if (error instanceof FriendlyError) {
							Logger.warn(
								`${error.stack}${oneLine`(Likely,
								this warning is safe to ignore, unless
								it's needed for debug purposes.)`}`
							);
							await PluginManager.sendErrorMessage(msg, error);
						} else {
							Logger.error(error.stack);
						}
					}
				}

				if (place) {
					// Attempts to runs commands through database
					const dbCommand:
						| Command
						| undefined = await this.client.database.findCommand(
						msg.command,
						msg.prefix,
						place
					);

					if (dbCommand) {
						Logger.debug(`Running command ${dbCommand.id}`);
						const success = await this.sendDatabaseCommand(
							dbCommand,
							msg
						);
						map.set(dbCommand.id, success);
					}
				}
			}
		} catch (error) {
			Logger.error(error.stack);
		}

		return map;
	}

	/**
	 * Sends a command from the database into chat.
	 *
	 * @param dbCommand Command entity
	 * @param msg Framed message object
	 *
	 * @returns true, if there was a database command to send.
	 */
	async sendDatabaseCommand(
		dbCommand: Command,
		msg: Message
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

			let sentSomething = false;

			if (msg.discord) {
				for await (const data of responseData.list) {
					const place = await msg.getPlace();
					const embeds = data.discord?.embeds;

					for (let i = 0; i < (embeds ? embeds.length : 1); i++) {
						// Gets the embed if it exists
						let embed: Discord.MessageEmbed | undefined;
						if (embeds) {
							const embedData = embeds[i];
							if (embedData) {
								embed = new Discord.MessageEmbed(embedData);
							}

							if (embed) {
								embed = await this.client.formatting.formatEmbed(
									embed,
									place
								);
							}
						}

						// If it's the first embed, and data content is a thing
						if (i == 0 && data.content && data.content.length > 0) {
							const formattedContent = await Message.format(
								data.content,
								this.client,
								place
							);

							// If there's an embed, send it. If not, don't
							if (embed) {
								await msg.discord.channel.send(
									formattedContent,
									embed
								);
								sentSomething = true;
							} else {
								await msg.discord.channel.send(
									formattedContent
								);
								sentSomething = true;
							}
						} else if (embed) {
							// If there is an embed but no content, send the embed
							await msg.discord.channel.send(embed);
							sentSomething = true;
						} else {
							// If there's no embed or content, somethign went wrong
							Logger.error(
								`Response data doesn't contain anything to output\n${util.inspect(
									data
								)}`
							);
						}
					}

					return sentSomething;
				}
			} else {
				for await (const data of responseData.list) {
					if (data.content) {
						await msg.send(data.content);
						sentSomething = true;
					}
				}
				return sentSomething;
			}
		} else {
			Logger.error(
				`PluginManager tried to output the response data, but there was none!`
			);
		}
		return false;
	}

	/**
	 * Sends a message showing help for a command.
	 *
	 * @param msg Framed Message containing command that needs to be shown help for
	 *
	 * @returns boolean value `true` if help is shown.
	 */
	static async sendHelpForCommand(
		msg: Message,
		place: Place
	): Promise<boolean> {
		const pluginManager = msg.client.plugins;

		const helpPrefix = pluginManager.map
			.get("default.bot.info")
			?.commands.get("help")
			?.getDefaultPrefix(place);

		const content = oneLineInlineLists`${
			helpPrefix ? helpPrefix : msg.prefix
		}help ${msg.command} ${msg.args ? msg.args : ""}`;

		if (msg.discord) {
			const newMsg = new Message({
				client: msg.client,
				content: content,
				discord: {
					client: msg.discord.client,
					channel: msg.discord.channel,
					author: msg.discord.author,
					guild: msg.discord.guild,
				},
			});
			await newMsg.getMessageElements();
			try {
				const success = await msg.client.plugins.runCommand(newMsg);
				if (success) {
					return true;
				} else {
					throw new Error("Help command execution didn't succeed");
				}
			} catch (error) {
				Logger.error(error.stack);
			}

			return false;
		} else if (msg.twitch) {
			const newMsg = new Message({
				client: msg.client,
				content: content,
				twitch: {
					chat: msg.twitch.chat,
					channel: msg.twitch.channel,
					user: msg.twitch.user,
				},
			});
			await newMsg.getMessageElements();
			try {
				const success = await msg.client.plugins.runCommand(newMsg);
				if (success) {
					return true;
				} else {
					throw new Error("Help command execution didn't succeed");
				}
			} catch (error) {
				Logger.error(error.stack);
			}

			return false;
		}

		return false;
	}

	/**
	 * Sends error message
	 *
	 * @param commandId Command ID for EmbedHelper.getTemplate
	 */
	static async sendErrorMessage(
		msg: Message,
		friendlyError: FriendlyError,
		commandId?: string
	): Promise<void> {
		if (msg.discord) {
			const embed = EmbedHelper.getTemplate(
				msg.discord,
				await EmbedHelper.getCheckOutFooter(msg, commandId)
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
	 * @param place Place data
	 *
	 * @returns Discord embed field data, containing brief info on commands
	 */
	async createHelpFields(
		helpList: HelpData[],
		place: Place
	): Promise<Discord.EmbedFieldData[]> {
		const connection = this.client.database.connection;
		if (!connection)
			throw new ReferenceError(DatabaseManager.errorNoConnection);

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
		const commandRepo = connection.getRepository(Command);

		// Does the wrong query with the OR AND AND
		// (oh god)
		const databaseCommands = await commandRepo.find({
			relations: ["response", "group", "defaultPrefix"],
		});

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
					const args = Message.getArgs(commandElement);
					const command = args.shift();

					if (!command) {
						throw new Error("command is null or undefined");
					}

					const foundData = (
						await this.client.plugins.getFoundCommandData(
							command,
							args,
							place
						)
					)[0];

					// If there's a command found,
					if (foundData) {
						const commandString = this.client.formatting.getCommandRan(
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

		// Searches through database
		for await (const command of databaseCommands) {
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
			const emote = command.group.emote ? command.group.emote : "❔";

			groupIconMap.set(group, emote);

			entries.set(command.id, {
				group: group,
				description: content,
				small,
			});
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
		const connection = this.client.database.connection;
		if (!connection) return undefined;

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

		// If there's something to push
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
}
