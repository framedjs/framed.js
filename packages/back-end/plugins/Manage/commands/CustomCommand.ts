/* eslint-disable no-mixed-spaces-and-tabs */
import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { BasePlugin } from "../../../src/structures/BasePlugin";
import { oneLine, stripIndent } from "common-tags";
import EmbedHelper from "../../../src/utils/discord/EmbedHelper";
import { logger } from "shared";
import * as TypeORM from "typeorm";
import PluginManager from "../../../src/managers/PluginManager";
import Command from "../../../src/managers/database/entities/Command";
import Prefix from "../../../src/managers/database/entities/Prefix";
import Response from "../../../src/managers/database/entities/Response";
import ResponseData from "packages/back-end/src/managers/database/interfaces/ResponseData";

export default class CustomCommand extends BaseCommand {
	/**
	 * Map to store aliases of the add/edit/remove argument
	 */
	private addEditRemoveAliases: Map<string, string>;

	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "command",
			aliases: ["cmd", "cmds", "com"],
			about: "Adds, edits, and deletes custom commands.",
			usage: "<add|edit|delete> <command ID> <content> [desc.]",
			examples: stripIndent`
			\`{{prefix}}command add testmsg This is a test message.\`
			\`{{prefix}}command edit testmsg We've edited the message!\`
			\`{{prefix}}command delete testmsg\``,
			permissions: {
				discord: {
					permissions: ["MANAGE_MESSAGES"],
					// Mods, Community Manager
					roles: ["462342299171684364", "758771336289583125"],
				},
			},
			emojiIcon: "📝",
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

	/**
	 * Default run command
	 * @param msg FramedMessage object
	 */
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
						addEditRemoveParam,
						commandId,
						questionArgs,
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
										questionArgs,
										msg
									)) != undefined
								);
							case "edit":
								return (
									(await this.editCommand(
										commandId,
										questionArgs,
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
					await PluginManager.showHelp(msg, this.id);
					return true;
				}
			} else {
				// Show the commands
				const connection = this.framedClient.databaseManager.connection;
				if (connection) {
					const commandRepo = connection.getRepository(Command);
					const commands = await commandRepo.find({
						relations: ["defaultPrefix", "response"],
					});

					let contents = "";

					for (const command of commands) {
						const description =
							command.response.responseData?.description;

						contents += stripIndent`
						\`${command.defaultPrefix.prefix}${command.id}\` - ${
							description ? description : ""
						}
						`;
						contents += "\n";
					}

					// Message if there's no commands
					if (contents.length == 0) {
						const infoPlugin = this.framedClient.pluginManager.plugins.get(
							"default.bot.info"
						);
						const helpCommand = infoPlugin?.commands.get("help");

						contents = stripIndent`
						There are no custom commands to show.
						To see how you can add one, try \`${
							helpCommand ? helpCommand.defaultPrefix : "."
						}${helpCommand ? helpCommand.id : "help"} ${
							this.id
						}\`.`;
					}

					if (msg.discord) {
						const embed = EmbedHelper.getEmbedTemplate(
							msg.discord,
							this.framedClient,
							this.id
						).setDescription(contents);
						await msg.discord.channel.send(embed);
						return true;
					}
				}
			}
		}
		await PluginManager.showHelp(msg, this.id);
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
				addEditRemoveParam: string;
				commandId: string;
				questionContent: string;
				questionArgs: string[];
		  }
		| undefined {
		const addEditRemoveParam = args[0];
		const commandId = args[1];

		if (addEditRemoveParam && commandId) {
			const questionContent = content
				.replace(prefix, "")
				.replace(command, "")
				.replace(addEditRemoveParam, "")
				.replace(commandId, "")
				.trim();

			const state = addEditRemove.get(addEditRemoveParam);
			if (state) {
				const questionArgs = FramedMessage.getArgs(questionContent, {
					separateByQuoteSections: true,
				});

				logger.debug(stripIndent`
					Command.ts: 
					questionContent: '${questionContent}'
					questionArgs: '${questionArgs}'
				`);

				return {
					addEditRemoveParam: addEditRemoveParam,
					commandId: commandId,
					questionContent: questionContent,
					questionArgs: questionArgs,
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
		// Repositories
		const prefixRepo = TypeORM.getRepository(Prefix);
		const commandRepo = TypeORM.getRepository(Command);
		const responseRepo = TypeORM.getRepository(Response);

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
				if (!command) {
					// Add response, if command doesn't exist
					newResponse = await responseRepo.save(
						responseRepo.create({
							responseData: {
								description: newContents[1],
								list: [
									{
										content: newContents[0],
									},
								],
							},
							commandResponses: [command],
						})
					);
				} else {
					// Edit response
					const newList: ResponseData[] = [];
					newContents.forEach(content => {
						newList.push({
							content: content,
						});
					});

					if (oldResponse?.responseData) {
						oldResponse.responseData.list = newList;
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
		const parse = await CustomCommand.customParseCommand(
			newCommandId,
			newContents,
			msg
		);

		// If the user didn't enter the command right, show help
		if (!parse) {
			if (msg && !silent) {
				await PluginManager.showHelp(msg, this.id);
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
		const commandRepo = TypeORM.getRepository(Command);
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
				await this.framedClient.databaseManager.deleteResponseFromDB(
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
	 * will be generated through taaaawfeawfawefawf
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
		const parse = await CustomCommand.customParseCommand(
			newCommandId,
			newContents,
			msg
		);

		// If the user didn't enter the command right, show help
		if (!parse) {
			if (msg && !silent) {
				await PluginManager.showHelp(msg, this.id);
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
			const commandRepo = TypeORM.getRepository(Command);
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
			newCommandId,
			undefined,
			msg
		);

		// If the user didn't enter the command right, show help
		if (!parse) {
			if (msg && !silent) {
				await PluginManager.showHelp(msg, this.id);
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
					await this.framedClient.databaseManager.deleteCommandFromDB(
						command.id
					);

					// Tries and deletes the response
					// TODO: don't delete the command if there's anything else connected to it
					if (
						response.commandResponses &&
						response.commandResponses.length <= 1
					) {
						try {
							await this.framedClient.databaseManager.deleteResponseFromDB(
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
