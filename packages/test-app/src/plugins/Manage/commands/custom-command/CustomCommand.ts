/* eslint-disable no-mixed-spaces-and-tabs */
import FramedMessage from "back-end/src/structures/FramedMessage";
import { BaseCommand } from "back-end/src/structures/BaseCommand";
import { BasePlugin } from "back-end/src/structures/BasePlugin";
import { oneLine, stripIndent } from "common-tags";
import { logger } from "shared";
import PluginManager from "back-end/src/managers/PluginManager";
import Command from "back-end/src/managers/database/entities/Command";
import Prefix from "back-end/src/managers/database/entities/Prefix";
import Response from "back-end/src/managers/database/entities/Response";
import ResponseData from "back-end/src/managers/database/interfaces/ResponseData";
import { QuoteSections } from "back-end/src/interfaces/FramedMessageArgsSettings";
import { SnowflakeUtil } from "discord.js";
import { DatabaseManager } from "back-end/src/managers/DatabaseManager";

export default class CustomCommand extends BaseCommand {
	/**
	 * Map to store aliases of the add/edit/remove argument
	 */
	private addEditRemoveAliases: Map<string, string>;

	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "command",
			aliases: ["customcommand", "cmd", "com"],
			about: "Manages commands.",
			description: oneLine`
			This command also allows you to add, edit, and
			delete custom commands. See \`.addcom\`, \`.editcom\`, and \`.delcom\`.`,
			usage: `<add|edit|delete> <command ID> <content> "[description]"`,
			examples: stripIndent`
			\`{{prefix}}command add newcommand This is a test message.\`
			\`{{prefix}}command edit newcommand We've edited the message! "New description!"\`
			\`{{prefix}}command delete newcommand\``,
			permissions: {
				discord: {
					permissions: ["MANAGE_MESSAGES"],
					// Mods, Community Manager
					roles: ["462342299171684364", "758771336289583125"],
				},
			},
			hideUsageInHelp: true,
		});

		this.addEditRemoveAliases = CustomCommand.createAddEditRemoveAliases();
	}

	/**
	 * Generates the add/edit/remove aliases
	 * @returns Add/edit/remove aliases in a map
	 */
	public static createAddEditRemoveAliases(): Map<string, string> {
		const addEditRemoveAliases = new Map<string, string>();

		// Creates some aliases for the subcommand
		// Ex. "add" will turn into "add" and "a"
		const addString = "add";
		addEditRemoveAliases
			.set(addString, addString)
			.set(addString[0], addString);

		// "create" will have an alias of "cr"
		const createString = "create";
		addEditRemoveAliases
			.set(createString, createString)
			.set(createString.substring(0, 2), createString);

		// "change" will have an alias of "ch"
		const changeString = "change";
		addEditRemoveAliases
			.set(changeString, changeString)
			.set(changeString.substring(0, 2), changeString);

		// "edit" will have an alias of "e"
		const editString = "edit";
		addEditRemoveAliases
			.set(editString, editString)
			.set(editString[0], editString);

		// "delete" will have aliases of "del", "d"
		const deleteString = "delete";
		addEditRemoveAliases
			.set(deleteString, deleteString)
			.set(deleteString.substring(0, 3), deleteString)
			.set(deleteString.substring(0, 1), deleteString)
			.set(deleteString[0], deleteString);

		// "remove" will have aliases of "rem", "rm"
		const removeString = "remove";
		addEditRemoveAliases
			.set(removeString, deleteString)
			.set("rm", deleteString)
			.set(removeString.substring(0, 2), deleteString);

		return addEditRemoveAliases;
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.prefix && msg.command && msg.args) {
			// If there's content
			if (msg.args.length > 0) {
				const parse = CustomCommand.customParse(
					msg.prefix,
					msg.command,
					msg.content,
					msg.args,
					this.addEditRemoveAliases
				);

				if (parse) {
					const {
						subcommand: addEditRemoveParam,
						newCommandId: commandId,
						args: newArgs,
					} = parse;

					// Tries and get the aliases
					const state = this.addEditRemoveAliases?.get(
						addEditRemoveParam
					);
					if (state) {
						const hasPermission = this.hasPermission(msg);

						if (!hasPermission) {
							await this.sendPermissionErrorMessage(msg);
							return false;
						}

						switch (state?.toLocaleLowerCase()) {
							case "add":
								return (
									(await this.addCommand(
										commandId,
										newArgs,
										msg
									)) != undefined
								);
							case "edit":
								return (
									(await this.editCommand(
										commandId,
										newArgs,
										msg
									)) != undefined
								);
							case "delete":
								return (
									(await this.deleteCommand(
										commandId,
										msg
									)) != undefined
								);
						}
					}
				} else {
					await PluginManager.showHelpForCommand(msg);
					return true;
				}
			}
		}
		await PluginManager.showHelpForCommand(msg);
		return false;
	}

	/**
	 * Custom parses the "add/remove/edit" part, along with
	 * getting contents into arguments.
	 *
	 * @param prefix Prefix string
	 * @param command Command string
	 * @param content Contents string
	 * @param args Arguments array of strings
	 * @param msg FramedMessage object
	 * @param slient Should the error messages not be shown in Discord?
	 *
	 * @returns Object containing variables, or fails
	 */
	static customParse(
		prefix: string,
		command: string,
		content: string,
		args: string[],
		addEditRemove: Map<string, string>
	):
		| {
				subcommand: string;
				newCommandId: string;
				questionContent: string;
				args: string[];
		  }
		| undefined {
		const subcommand = args[0];
		const newCommandId = args[1];

		if (subcommand && newCommandId) {
			const questionContent = content
				.replace(prefix, "")
				.replace(command, "")
				.replace(subcommand, "")
				.replace(newCommandId, "")
				.trim();

			const state = addEditRemove.get(subcommand);
			if (state) {
				const questionArgs = FramedMessage.getArgs(questionContent, {
					quoteSections: QuoteSections.Flexible,
				});

				logger.debug(stripIndent`
					Command.ts: 
					questionContent: '${questionContent}'
					questionArgs: '${questionArgs}'
				`);

				return {
					subcommand: subcommand,
					newCommandId: newCommandId,
					questionContent: questionContent,
					args: questionArgs,
				};
			}
		}

		return undefined;
	}

	/**
	 * Manages commands. To be used as a base for any command-related things,
	 * such as adding, editing, or removing commands.
	 *
	 * @param newCommandId Command ID string
	 * @param newContents Contents to add, in an array
	 * @param msg FramedMessage object
	 *
	 * @returns Response and prefix entities, or undefined
	 */
	static async customParseCommand(
		databaseManager: DatabaseManager,
		newCommandId: string,
		newContents?: string[],
		msg?: FramedMessage,
		silent?: boolean
	): Promise<
		| {
				prefix: Prefix;
				command?: Command;
				oldResponse?: Response;
				newResponse?: Response;
		  }
		| undefined
	> {
		const connection = databaseManager.connection;
		if (!connection) {
			logger.error("No connection to a database found!");
			return undefined;
		}

		// Repositories
		const prefixRepo = connection.getRepository(Prefix);
		const commandRepo = connection.getRepository(Command);
		const responseRepo = connection.getRepository(Response);

		// Checks if the ID is valid
		if (newCommandId.includes(" ")) {
			if (msg && !silent)
				await msg.discord?.channel.send(
					`${msg.discord.author}, a command ID cannot have spaces!`
				);
			return undefined;
		}

		// Finds a command, but could also return undefined. This is intentional
		const command = await commandRepo.findOne({
			where: {
				id: newCommandId,
			},
			relations: ["response"],
		});

		let oldResponse: Response | undefined;
		if (command) {
			oldResponse = await responseRepo.findOne({
				where: {
					id: command.response.id,
				},
				relations: ["commandResponses"],
			});
		}

		// Uses the default prefix by default
		const defaultPrefix = await prefixRepo.findOne({
			id: "default",
		});
		if (defaultPrefix) {
			let newResponse: Response | undefined;

			// If we've been given an empty message, say that it failed to parse
			if (newContents?.length == 0) {
				return undefined;
			}

			// Generates response data for adding + editing
			if (newContents) {
				// Gets the last content
				let lastContent: string | undefined =
					newContents[newContents.length - 1];

				// If the last content section is the beginning, lastContent becomes undefined,
				// and won't be used as a description.
				if (lastContent == newContents[0]) {
					lastContent = undefined;
				}

				const newList: ResponseData[] = [];

				// Gets all possible responses, excluding the description if it exists
				for (
					let i = 0;
					i < newContents.length - (lastContent ? 1 : 0);
					i++
				) {
					const element = newContents[i];
					newList.push({
						content: element,
					});
				}

				if (!command) {
					// Add response, if command doesn't exist
					newResponse = await responseRepo.save(
						responseRepo.create({
							id: SnowflakeUtil.generate(new Date()),
							responseData: {
								description: lastContent,
								list: newList,
							},
							commandResponses: [command],
						})
					);
				} else {
					// Edit response
					if (oldResponse?.responseData) {
						oldResponse = responseRepo.create({
							id: oldResponse.id,
							responseData: {
								description: lastContent,
								list: newList,
							},
						});
						newResponse = await responseRepo.save(oldResponse);
					} else {
						throw new Error(
							"oldResponse.responseData is undefined"
						);
					}
				}
			}

			return {
				prefix: defaultPrefix,
				command: command,
				oldResponse: oldResponse,
				newResponse: newResponse,
			};
		} else {
			logger.error("Couldn't find prefix!");
			if (msg && !silent) {
				await msg.discord?.channel.send(oneLine`
				${msg.discord?.author}, something went wrong with getting a prefix inside a database. 
				It is probably not your fault. Contact the developers about this error message!`);
			}
		}

		return undefined;
	}

	/**
	 * Adds a command.
	 *
	 * @param newCommandId Command ID string
	 * @param newContents Contents to add, in an array
	 * @param msg FramedMessage object
	 *
	 * @returns New command
	 */
	async addCommand(
		newCommandId: string,
		newContents: string[],
		msg?: FramedMessage,
		silent?: boolean
	): Promise<Command | undefined> {
		const connection = this.framedClient.databaseManager.connection;
		if (!connection) {
			logger.error("No connection to a database found!");
			return undefined;
		}

		const parse = await CustomCommand.customParseCommand(
			this.framedClient.databaseManager,
			newCommandId,
			newContents,
			msg
		);

		// If the user didn't enter the command right, show help
		if (!parse) {
			if (msg && !silent) {
				await PluginManager.showHelpForCommand(msg);
			}
			return undefined;
		}

		const prefix = parse.prefix;
		let command = parse.command;
		const response = parse.newResponse;

		// If there's no response, if newContents is undefined
		if (!response) {
			logger.error(
				"No response returned for CustomCommand.ts addCommand()!"
			);
			return undefined;
		}

		// Checks if the command already exists
		const commandRepo = connection.getRepository(Command);
		if (command) {
			if (msg && !silent) {
				await msg?.discord?.channel.send(
					`${msg.discord.author}, the command already exists!`
				);
			}
			return undefined;
		}

		// Tries and writes the command. If it fails,
		// send an error message to console and delete the new response data.
		try {
			command = commandRepo.create({
				id: newCommandId.toLocaleLowerCase(),
				response: response,
			});

			command.defaultPrefix = prefix;
			command.prefixes = [prefix];

			command = await commandRepo.save(command);
		} catch (error) {
			try {
				await this.framedClient.databaseManager.deleteResponse(
					response.id
				);
			} catch (error) {
				logger.error(`Failed to delete response\n${error.stack}`);
			}
			logger.error(`Failed to add command\n${error.stack}`);
		}

		// If the command was valid, and (probably) didn't error out
		if (command) {
			if (msg?.discord) {
				// await msg.discord.channel.send(
				// 	`${prefix.id} ${command.id} ${prefix.id}`
				// );
				// await msg.discord.channel.send(
				// 	`${prefix.prefix}${command.id} ${util.inspect(
				// 		response.responseData
				// 	)}`
				// );
				await msg.discord.channel.send(
					`${msg.discord.author}, I've added the \`${prefix.prefix}${command.id}\` command.`
				);
			}
		}
	}

	/**
	 * Edits a command.
	 *
	 * @param newCommandId Command ID string
	 * @param newContents Contents to add, in an array. If undefined, the response
	 * will be generated through
	 * @param msg FramedMessage object
	 *
	 * @returns Edited command
	 */
	async editCommand(
		newCommandId: string,
		newContents: string[],
		msg?: FramedMessage,
		silent?: boolean
	): Promise<Command | undefined> {
		const connection = this.framedClient.databaseManager.connection;
		if (!connection) {
			logger.error("No connection to a database found!");
			return undefined;
		}

		const parse = await CustomCommand.customParseCommand(
			this.framedClient.databaseManager,
			newCommandId,
			newContents,
			msg
		);

		// If the user didn't enter the command right, show help
		if (!parse) {
			if (msg && !silent) {
				await PluginManager.showHelpForCommand(msg);
			}
			return undefined;
		}

		const prefix = parse.prefix;
		let command = parse.command;
		const response = parse.newResponse;

		// If there's no response, if newContents is undefined
		if (!response) {
			logger.error(
				"No response returned for CustomCommand.ts editCommand()!"
			);
			return undefined;
		}

		// Checks if the command exists
		if (command) {
			// Tries and writes the command. If it fails,
			// send an error message to console and delete the new response data.
			const commandRepo = connection.getRepository(Command);
			try {
				command = commandRepo.create({
					id: newCommandId.toLocaleLowerCase(),
					response: response,
				});

				command.defaultPrefix = prefix;
				command.prefixes = [prefix];

				command = await commandRepo.save(command);
			} catch (error) {
				// Outputs error
				logger.error(`${error.stack}`);
			}

			// If the command was valid, and (probably) didn't error out
			if (command) {
				if (msg?.discord) {
					// await msg.discord.channel.send(
					// 	`${prefix.id} ${command.id} ${prefix.id}`
					// );
					// await msg.discord.channel.send(
					// 	`${prefix.prefix}${command.id} ${util.inspect(
					// 		response.responseData
					// 	)}`
					// );
					await msg.discord.channel.send(
						`${msg.discord.author}, I've edited the \`${prefix.prefix}${command.id}\` command.`
					);
				}
			}
		} else {
			if (msg && !silent) {
				await msg?.discord?.channel.send(
					`${msg.discord.author}, the command doesn't exists!`
				);
			}
			return undefined;
		}
	}

	/**
	 * Deletes a command.
	 *
	 * @param newCommandId Command ID string
	 * @param msg FramedMessage object
	 */
	async deleteCommand(
		newCommandId: string,
		msg?: FramedMessage,
		silent?: boolean
	): Promise<void> {
		const parse = await CustomCommand.customParseCommand(
			this.framedClient.databaseManager,
			newCommandId,
			undefined,
			msg
		);

		// If the user didn't enter the command right, show help
		if (!parse) {
			if (msg && !silent) {
				await PluginManager.showHelpForCommand(msg);
			}
			return;
		}

		const prefix = parse.prefix;
		const command = parse.command;
		const response = parse.oldResponse;

		if (!command) {
			if (msg && !silent) {
				msg.discord?.channel.send(
					`${msg.discord.author}, the comamnd doesn't exist!`
				);
				return;
			}
		} else if (!response) {
			// If there's no response, if newContents is undefined
			logger.error(
				"No response returned for CustomCommand.ts deleteCommand()!"
			);
			return undefined;
		} else {
			// Checks if the command exists
			if (command) {
				// Tries and deletes the command
				try {
					await this.framedClient.databaseManager.deleteCommand(
						command.id
					);

					// Tries and deletes the response
					// TODO: don't delete the command if there's anything else connected to it
					if (
						response.commandResponses &&
						response.commandResponses.length <= 1
					) {
						try {
							await this.framedClient.databaseManager.deleteResponse(
								response.id
							);
						} catch (error) {
							logger.error(
								`Failed to delete response\n${error.stack}`
							);
						}
					}
				} catch (error) {
					// Outputs error
					logger.error(`${error.stack}`);
				}

				// If the command was valid, and (probably) didn't error out
				if (command) {
					if (msg?.discord) {
						// await msg.discord.channel.send(
						// 	`${prefix.id} ${command.id} ${prefix.id}`
						// );
						// await msg.discord.channel.send(
						// 	`${prefix.prefix}${command.id} ${util.inspect(
						// 		response.responseData
						// 	)}`
						// );
						await msg.discord.channel.send(
							`${msg.discord.author}, I've deleted the \`${prefix.prefix}${command.id}\` command.`
						);
					}
				}
			} else {
				if (msg && !silent) {
					await msg?.discord?.channel.send(
						`${msg.discord.author}, the command doesn't exists!`
					);
				}
				return undefined;
			}
		}
	}
}
