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
			const commandIdStr = msg.args[1];

			logger.debug(commandIdStr);

			if (addEditRemoveStr && commandIdStr) {
				const prefixRepo = TypeORM.getRepository(Prefix);
				const commandRepo = TypeORM.getRepository(Command);
				const responseRepo = TypeORM.getRepository(Response);

				switch (addEditRemoveStr.toLocaleLowerCase()) {
					case "add": {
						const defaultPrefix = await prefixRepo.findOne({
							id: "default",
						});
						if (defaultPrefix) {
							let command = await commandRepo.findOne({
								where: {
									id: commandIdStr,
								},
							});

							const newContent = msg.content
								.replace(msg.prefix, "")
								.replace(msg.command, "")
								.trimLeft()
								.replace(commandIdStr, "")
								.replace(addEditRemoveStr, "")
								.trimLeft();

							if (command) {
								msg.discord?.channel.send(
									`${msg.discord.author}, the command already exists!`
								);
								return false;
							}

							const contentArgsPlus = msg.args[2];
							if (!contentArgsPlus) {
								return PluginManager.showHelp(msg, this.id);
							} else {
								logger.debug(contentArgsPlus);
							}

							if (newContent.length < 1) {
								return PluginManager.showHelp(msg, this.id);
							}

							let newResponse = responseRepo.create({
								responseData: {
									list: [
										{
											content: newContent,
										},
									],
								},
							});

							newResponse = await responseRepo.save(newResponse);

							command = commandRepo.create({
								id: commandIdStr.toLocaleLowerCase(),
								response: newResponse,
							});

							command.defaultPrefix = defaultPrefix;
							command.prefixes = [defaultPrefix];

							command = await commandRepo.save(command);

							if (msg.discord) {
								await msg.discord.channel.send(
									`${defaultPrefix.id} ${command.id} ${newResponse.id}`
								);
								await msg.discord.channel.send(
									`${defaultPrefix.prefix}${
										command.id
									} ${util.inspect(newResponse.responseData)}`
								);
							}
						}

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
}
