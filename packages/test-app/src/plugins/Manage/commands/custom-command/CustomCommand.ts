/* eslint-disable no-mixed-spaces-and-tabs */

import { oneLine, stripIndents } from "common-tags";
import { logger } from "shared";
import { SnowflakeUtil } from "discord.js";
import path from "path";
import {
	BaseCommand,
	BasePlugin,
	DatabaseManager,
	FramedMessage,
	PluginManager,
	Command,
	Prefix,
	Response,
	QuoteSections,
	ResponseData,
} from "back-end";

export default class CustomCommand extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "command",
			aliases: ["customcommand", "cmd", "com"],
			about: "Manages commands.",
			description: oneLine`
			This command also allows you to list, add, edit, and delete custom commands.`,
			usage: `<add|edit|delete> <command ID> <content> "[description]"`,
			examples: stripIndents`
			\`{{prefix}}{{id}} list\`
			\`{{prefix}}{{id}} add newcommand This is a test message.\`
			\`{{prefix}}{{id}} edit newcommand We've edited the message! "New description!"\`
			\`{{prefix}}{{id}} delete newcommand\``,
			permissions: {
				discord: {
					permissions: ["MANAGE_MESSAGES"],
					// Mods, Community Manager
					roles: ["462342299171684364", "758771336289583125"],
				},
			},
			hideUsageInHelp: true,
			paths: {
				subcommands: path.join(__dirname, "subcommands"),
			},
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		await PluginManager.sendHelpForCommand(msg);
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
		args: string[]
	):
		| {
				subcommand: string;
				newCommandId: string;
				newContent: string;
				newArgs: string[];
		  }
		| undefined {
		const subcommand = args[0];
		const newCommandId = args[1];

		if (subcommand && newCommandId) {
			const newContent = content
				.replace(prefix, "")
				.replace(command, "")
				.replace(subcommand, "")
				.replace(newCommandId, "")
				.trim();

			const newArgs = FramedMessage.getArgs(newContent, {
				quoteSections: "flexible",
			});

			logger.debug(stripIndents`
				Command.ts: 
				newContent: '${newContent}'
				newArgs: '${newArgs}'
			`);

			return {
				subcommand: subcommand,
				newCommandId: newCommandId,
				newArgs: newArgs,
				newContent: newContent,
			};
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
			throw new ReferenceError(DatabaseManager.errorNoConnection);
		}

		// Repositories
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
		const defaultPrefix = await databaseManager.getDefaultPrefix();
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
				if (newContents.length < 2) {
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
							description: lastContent,
							responseData: {
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
							description: lastContent,
							responseData: {
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
			throw new ReferenceError("Couldn't find prefix!");
		}
	}
}
