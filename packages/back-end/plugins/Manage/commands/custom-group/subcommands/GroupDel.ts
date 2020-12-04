import FramedMessage from "../../../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../../../src/structures/BaseCommand";
import BaseSubcommand from "../../../../../src/structures/BaseSubcommand";
import { logger } from "shared";
import PluginManager from "../../../../../src/managers/PluginManager";
import { oneLine } from "common-tags";
import CustomGroup from "../CustomGroup";

export default class CustomGroupDel extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "delete",
			aliases: ["del", "remove"],
			about: "Deletes a custom group.",
			usage: `"<group>"`,
			examples: oneLine`
			\`{{prefix}}group delete "Food"\``,
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		// Checks for permission
		if (
			!this.baseCommand.hasPermission(msg, this.baseCommand.permissions)
		) {
			this.baseCommand.sendPermissionErrorMessage(msg);
			return false;
		}

		if (msg.args) {
			const parse = CustomGroup.parseEmojiAndGroup(msg, [msg.args[0]]);
			if (parse) {
				const { newContent } = parse;
				try {
					await this.framedClient.databaseManager.deleteGroup(
						newContent
					);

					await msg.discord?.channel.send(
						`${msg.discord.author}, I've deleted the group "${newContent}" succesfully!`
					);
				} catch (error) {
					if (error instanceof ReferenceError) {
						await msg.discord?.channel.send(
							`${msg.discord.author}, ${error.message}`
						);
					} else {
						logger.error(error.stack);
					}
				}
			} else {
				await PluginManager.showHelpForCommand(msg);
				return false;
			}

			return true;
		}
		return false;
	}
}
