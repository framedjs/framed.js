import { Logger } from "@framedjs/logger";
import { oneLine } from "common-tags";

import { Base } from "../structures/Base";
import { BaseCommand } from "../structures/BaseCommand";
import { Client } from "../structures/Client";
import { FriendlyError } from "../structures/errors/FriendlyError";
import { BaseMessage } from "../structures/BaseMessage";

import { FoundCommandData } from "../interfaces/FoundCommandData";
import { Place } from "../interfaces/Place";
import { Utils } from "@framedjs/shared";

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
	 *
	 * @returns String array of all possible prefixes
	 */
	getPossiblePrefixes(place: Place): string[] {
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

		Logger.silly(
			`${Utils.hrTimeElapsed(
				startTime
			)}s - Finished finding all possible prefixes.`
		);
		Logger.silly(process.hrtime(startTime));
		Logger.silly(`Prefixes: ${prefixes}`);
		return prefixes;
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

			// // If there's no prefix, find the default one from the provider
			// if (!prefix) {
			// 	prefix = this.client.provider.prefixes.get(place.id);
			// }
		}

		const data: FoundCommandData[] = [];

		// Runs the commands
		let commandList: BaseCommand[] = [];
		if (msgOrCommand instanceof BaseMessage) {
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
	getCommand(msg: BaseMessage, place: Place): BaseCommand | undefined;

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
		place: Place,
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
	getCommands(msg: BaseMessage, place: Place): BaseCommand[];

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
		place: Place,
		prefix?: string
	): BaseCommand[] {
		const commandList: BaseCommand[] = [];

		let commandString: string;

		if (msgOrCommand instanceof BaseMessage) {
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
		for (const plugin of this.client.plugins.pluginsArray) {
			// Gets the command from the plugin, if it can
			// Subcommands are not allowed to declare new prefixes
			let command = plugin.commands.get(commandString);

			// If not found, check the aliases
			if (!command) {
				// Tries to find the command from an alias
				command = plugin.aliases.get(commandString);
			}

			if (command) {
				// Gets all valid prefixes for the place, and command
				const commandPrefixes = command.getPrefixes(place);
				commandPrefixes.push(...this.defaultPrefixes);

				// Gets the base command's prefixes or default prefixes, and see if they match.
				// If there was no prefix defined, ignore prefix checks.
				const commandUsesPrefix = prefix
					? commandPrefixes.includes(prefix)
					: true;

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
			if (msg.prefix && msg.command) {
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
						const success = await tempCommand.run(msg);
						map.set(tempCommand.fullId, success);
					} catch (error) {
						if (error instanceof FriendlyError) {
							Logger.warn(
								`${error.stack}${oneLine`(Likely,
								this warning is safe to ignore, unless
								it's needed for debug purposes.)`}`
							);
							await msg.sendErrorMessage(error);
						} else {
							Logger.error(error.stack);
						}
					}
				}
			}
		} catch (error) {
			Logger.error(error.stack);
		}

		Logger.debug(`${Utils.hrTimeElapsed(startTime)}s - Finished execution`);
		return map;
	}
}
