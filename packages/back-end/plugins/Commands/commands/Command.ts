import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { BasePlugin } from "../../../src/structures/BasePlugin";
import { stripIndent } from "common-tags";
import EmbedHelper from "../../../src/utils/discord/EmbedHelper";
import { logger } from "shared";
import * as TypeORM from "typeorm";
import PluginManager from "../../../src/managers/PluginManager";
import Command from "../../../src/managers/database/entities/Command";
import Prefix from "../../../src/managers/database/entities/Prefix";
import Response from "../../../src/managers/database/entities/Response";
import util from "util";
import ResponseData from "packages/back-end/src/managers/database/interfaces/ResponseData";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "command",
			aliases: ["cmd", "com"],
			about: "Adds, edits, and removes commands.",
			usage: "[add|edit|[remove|del|delete]] <command ID> <content>",
			emojiIcon: "📝",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.prefix && msg.command && msg.args && msg.args.length > 0) {
			const addEditRemoveStr = msg.args[0];
			const commandId = msg.args[1];

			if (addEditRemoveStr && commandId) {
				const contentNotSplit = msg.content
					.replace(msg.prefix, "")
					.replace(msg.command, "")
					.replace(addEditRemoveStr, "")
					.trimLeft();
				let questionContent = contentNotSplit.split(`"`)[0];
				logger.debug(stripIndent`
					Command.ts: 
					questionContentNotSplit: '${contentNotSplit}'
					questionContent: '${questionContent}'
				`);
				switch (addEditRemoveStr.toLocaleLowerCase()) {
					case "add": {
						const msgArgsClone = [...msg.args].slice(
							2,
							msg.args.length
						);
						logger.debug(msgArgsClone);
						logger.debug(msg.args);
						this.addCommand(commandId, msgArgsClone, msg);
						break;
					}
					case "remove":
						break;

					default:
						if (msg.discord) {
							return PluginManager.showHelp(msg, this.id);
						}
						return false;
				}
			}

			return true;
		}
		return PluginManager.showHelp(msg, this.id);
	}

	async addCommand(
		newCommandId: string,
		newContents: string[],
		msg?: FramedMessage
	): Promise<Command | undefined> {
		// Repositories
		const prefixRepo = TypeORM.getRepository(Prefix);
		const commandRepo = TypeORM.getRepository(Command);
		const responseRepo = TypeORM.getRepository(Response);

		// Checks if the ID is valid
		if (newCommandId.includes(" ")) {
			if (msg)
				msg.discord?.channel.send(
					`${msg.discord.author}, a command ID cannot have spaces!`
				);
			return undefined;
		}

		// Uses the default prefix by default
		const defaultPrefix = await prefixRepo.findOne({
			id: "default",
		});
		if (defaultPrefix) {
			let command = await commandRepo.findOne({
				where: {
					id: newCommandId,
				},
			});

			// Checks if the command already exists
			if (command) {
				msg?.discord?.channel.send(
					`${msg.discord.author}, the command already exists!`
				);
				return undefined;
			}

			// If the user did the command parameters wrong, show the help command
			if (newContents[0]?.length < 1) {
				if (msg) PluginManager.showHelp(msg, this.id);
				return undefined;
			}

			// Response data
			const newList: ResponseData[] = [];
			newContents.forEach(content => {
				newList.push({
					content: content,
				});
			});
			let newResponse = responseRepo.create({
				responseData: {
					list: newList,
				},
			});
			newResponse = await responseRepo.save(newResponse);

			// Tries and writes the command. If it fails,
			// send an error message to console and delete the response data.
			try {
				command = commandRepo.create({
					id: newCommandId.toLocaleLowerCase(),
					response: newResponse,
				});

				command.defaultPrefix = defaultPrefix;
				command.prefixes = [defaultPrefix];

				command = await commandRepo.save(command);
			} catch (error) {
				const connection = this.framedClient.databaseManager.connection;
				if (connection) {
					// Deletes command
					connection
						.createQueryBuilder()
						.delete()
						.from(Response)
						.where("id = :id", {
							id: newResponse.id,
						})
						.execute();
				} else {
					logger.error("No connection to database!");
				}

				// Outputs error
				logger.error(`${error.stack}`);
			}

			// If the command was valid, and (probably) didn't error out
			if (command) {
				if (msg?.discord) {
					await msg.discord.channel.send(
						`${defaultPrefix.id} ${command.id} ${newResponse.id}`
					);
					await msg.discord.channel.send(
						`${defaultPrefix.prefix}${command.id} ${util.inspect(
							newResponse.responseData
						)}`
					);
				}
			}
		}
	}
}
