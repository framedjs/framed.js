import { Logger } from "@framedjs/logger";
import { oneLine, oneLineInlineLists } from "common-tags";

import { Base } from "../structures/Base";
import { BaseCommand } from "../structures/BaseCommand";
import { Client } from "../structures/Client";
import { FriendlyError } from "../structures/errors/FriendlyError";
import { BaseMessage } from "../structures/BaseMessage";

import { FoundCommandData } from "../interfaces/FoundCommandData";
import { Place } from "../interfaces/Place";
import { Utils } from "@framedjs/shared";
import { DiscordMessage } from "../structures/DiscordMessage";
import { TwitchMessage } from "../structures/TwitchMessage";
import { EmbedHelper } from "../utils/discord/EmbedHelper";

import Discord from "discord.js";

export class CommandManager extends Base {
	constructor(client: Client) {
		super(client);
	}

	/**
	 * List of all the default prefixes
	 *
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
	 * BaseCommand array
	 *
	 * @returns List of all the base commands from all plugins
	 */
	get commandsArray(): BaseCommand[] {
		const commands: BaseCommand[] = [];
		this.client.plugins.map.forEach(plugin => {
			commands.push(...Array.from(plugin.commands.values()));
		});
		return commands;
	}

	/**
	 * List of all possible prefixes for the specific guild or Twitch channel.
	 *
	 * @param place Place data
	 * @param guild Discord Guild, for the role prefix
	 *
	 * @returns String array of all possible prefixes
	 */
	getPossiblePrefixes(place: Place, guild?: Discord.Guild): string[] {
		const startTime = process.hrtime();
		const prefixes = this.defaultPrefixes;

		// From commands: adds to the list of potential prefixes (also removes duplicates)
		for (const command of this.commandsArray) {
			const commandPrefixes = command.getPrefixes(place);
			for (const prefix of commandPrefixes) {
				if (!prefixes.includes(prefix)) {
					Logger.silly(`[${process.hrtime(startTime)}] - ${prefix}`);
					prefixes.push(prefix);
				}
			}
		}

		if (guild) {
			const rolePrefix = this.getBotRolePrefix(guild);
			if (rolePrefix) {
				prefixes.push(rolePrefix);
			}
		}

		Logger.silly(
			`${Utils.hrTimeElapsed(
				startTime
			)}s - Finished finding all possible prefixes.`
		);
		Logger.silly(process.hrtime(startTime));
		Logger.silly(`Prefixes: ${prefixes}`);
		return prefixes;
	}

	/**
	 * Retrieves the bot's automatic role for a prefix
	 * @param guild Discord Guild
	 */
	getBotRolePrefix(guild: Discord.Guild): string | undefined {
		const roles = guild.roles;
		const botRole = roles.cache.find(
			a => a.name === guild.me?.user.username
		);

		if (botRole) {
			return botRole.toString();
		}
	}

	//#region Getting commands

	/**
	 *
	 * @param msg Framed message
	 */
	async getFoundCommandData(
		msg: BaseMessage,
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
		msgOrCommand: BaseMessage | string,
		argsOrPlace?: string[] | Place,
		place?: Place,
		prefix?: string
	): Promise<FoundCommandData[]> {
		let command: string;
		let args: string[];

		if (msgOrCommand instanceof BaseMessage) {
			if (msgOrCommand.command != undefined) {
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
		if (msgOrCommand instanceof BaseMessage) {
			// Grabs all the guild's roles here, so this.getCommands and
			// this.getBotRolePrefix doesn't have to be async to retrieve
			// possibly missing roles from cache
			if (
				msgOrCommand instanceof DiscordMessage &&
				msgOrCommand.content.includes("<@&")
			) {
				try {
					await msgOrCommand.discord.guild?.roles.fetch();
				} catch (error) {
					Logger.error(error.stack);
				}
			}

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
		place?: Place,
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
	getCommand(msg: BaseMessage, place?: Place): BaseCommand | undefined;

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
		msgOrCommand: BaseMessage | string,
		place?: Place,
		prefix?: string
	): BaseCommand | undefined {
		if (msgOrCommand instanceof BaseMessage) {
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
	getCommands(command: string, place?: Place, prefix?: string): BaseCommand[];

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
	getCommands(msg: BaseMessage, place?: Place): BaseCommand[];

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
		msgOrCommand: BaseMessage | string,
		place?: Place,
		prefix?: string
	): BaseCommand[] {
		const commandList: BaseCommand[] = [];

		let commandString: string;

		if (msgOrCommand instanceof BaseMessage) {
			if (msgOrCommand.command != undefined) {
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
		for (const plugin of this.client.plugins.pluginsArray) {
			// Gets the command from the plugin, if it can
			// Subcommands are not allowed to declare new prefixes
			let command = plugin.commands.get(commandString);

			// If not found, check the aliases
			if (command == undefined) {
				// Tries to find the command from an alias
				command = plugin.aliases.get(commandString);
			}

			if (command != undefined) {
				let commandUsesPrefix = true;

				if (prefix && place) {
					// Gets all valid prefixes for the place, and command
					const commandPrefixes = command.getPrefixes(place);
					commandPrefixes.push(...this.defaultPrefixes);

					if (
						msgOrCommand instanceof DiscordMessage &&
						msgOrCommand.discord.guild
					) {
						const rolePrefix = this.getBotRolePrefix(
							msgOrCommand.discord.guild
						);
						if (rolePrefix) commandPrefixes.push(rolePrefix);
					}

					// Gets the base command's prefixes or default prefixes, and see if they match.
					// If there was no prefix defined, ignore prefix checks.
					commandUsesPrefix = commandPrefixes.includes(prefix);
				}

				if (commandUsesPrefix) {
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
	async run(msg: BaseMessage): Promise<Map<string, boolean>> {
		const startTime = process.hrtime();

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
			if (msg.prefix != undefined && msg.command != undefined) {
				Logger.debug(`Checking for commands for "${msg.content}"`);

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
						Logger.debug(
							`${Utils.hrTimeElapsed(
								startTime
							)}s - Found a command (${tempCommand.fullId})`
						);

						// Checks automatically the permissions
						if (
							tempCommand.userPermissions?.checkAutomatically ==
								undefined ||
							tempCommand.userPermissions?.checkAutomatically ==
								true
						) {
							const data = tempCommand.checkForPermissions(msg);
							if (!data.success) {
								const sent = await tempCommand.sendPermissionErrorMessage(
									msg,
									tempCommand.userPermissions,
									data
								);
								if (!sent) {
									Logger.error(oneLine`"${tempCommand.id}" tried to send
									a permission error message, but couldn't send anything!`);
								}
								map.set(tempCommand.fullId, false);
								continue;
							}
						}
						Logger.verbose(`Running command "${msg.content}"`);
						const success = await tempCommand.run(msg);
						map.set(tempCommand.fullId, success);
					} catch (error) {
						if (error instanceof FriendlyError) {
							Logger.warn(
								`${error.stack}${oneLine`(Likely,
								this warning is safe to ignore, unless
								it's needed for debug purposes.)`}`
							);
							await this.sendErrorMessage(msg, error);
						} else {
							Logger.error(error.stack);
						}
					}
				}
			}
		} catch (error) {
			Logger.error(error.stack);
		}

		Logger.debug(
			`${Utils.hrTimeElapsed(
				startTime
			)}s - Finished finding and sending commands`
		);
		return map;
	}

	/**
	 * Sends a message showing help for a command.
	 *
	 * @param msg Framed Message containing command that needs to be shown help for
	 *
	 * @returns boolean value `true` if help is shown.
	 */
	async sendHelpForCommand(msg: BaseMessage): Promise<boolean> {
		try {
			const helpCommand = msg.client.commands.getCommand("help");

			if (!helpCommand) {
				Logger.warn("No help command found");
				return false;
			}

			const place = await msg.getPlace();
			const helpPrefix = helpCommand.getDefaultPrefix(place);

			const content = oneLineInlineLists`${
				helpPrefix ??
				msg.client.commands.defaultPrefixes[0] ??
				msg.client.defaultPrefix
			}help ${msg.command} ${msg.args ?? ""}`.trim();

			let newMsg: DiscordMessage | TwitchMessage;
			let guild: Discord.Guild | undefined;
			if (msg instanceof DiscordMessage) {
				newMsg = new DiscordMessage({
					client: msg.client,
					content: content,
					discord: {
						client: msg.discord.client,
						channel: msg.discord.channel,
						author: msg.discord.author,
						guild: msg.discord.guild,
					},
				});

				guild = msg.discord.guild ?? undefined;
			} else if (msg instanceof TwitchMessage) {
				newMsg = new TwitchMessage({
					client: msg.client,
					content: content,
					twitch: {
						chat: msg.twitch.chat,
						channel: msg.twitch.channel,
						user: msg.twitch.user,
					},
				});
			} else {
				throw new Error("Unknown message class");
			}

			await newMsg.getMessageElements(place, guild);
			const success = await helpCommand.run(newMsg);
			if (success) {
				return true;
			} else {
				throw new Error("Help command execution didn't succeed");
			}
		} catch (error) {
			Logger.error(error.stack);
			return false;
		}
	}

	/**
	 * Sends error message
	 *
	 * @param friendlyError
	 * @param commandId Command ID for EmbedHelper.getTemplate
	 */
	async sendErrorMessage(
		msg: BaseMessage,
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
}
