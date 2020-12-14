import FramedMessage from "back-end/src/structures/FramedMessage";
import { BaseCommand } from "back-end/src/structures/BaseCommand";
import BaseSubcommand from "back-end/src/structures/BaseSubcommand";
import { logger } from "shared";
import PluginManager from "back-end/src/managers/PluginManager";
import { oneLine } from "common-tags";
import CustomGroup from "../CustomGroup";

export default class CustomGroupAdd extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "add",
			aliases: ["create"],
			about: "Adds a custom group.",
			usage: `"<emote + group name>"`,
			examples: oneLine`
			\`{{prefix}}group add "🍎 Food Stuff"\``,
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
			const parse = CustomGroup.parseEmojiAndGroup(msg, [this.id]);
			if (parse) {
				const { newContent, newEmote } = parse;
				try {
					await this.framedClient.databaseManager.addGroup(
						newContent,
						newEmote
					);
	
					if (newEmote) {
						await msg.discord?.channel.send(
							oneLine`${msg.discord.author}, I've added the group "${newContent}" with
							emote "${newEmote}" succesfully!`
						);
					} else {
						await msg.discord?.channel.send(
							`${msg.discord.author}, I've added the group "${newContent}" succesfully!`
						);
					}
				} catch (error) {
					if (error instanceof ReferenceError) {
						await msg.discord?.channel.send(
							`${msg.discord.author}, ${error.message}`
						);
					} else {
						logger.error(error);
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
