import {
	FramedMessage,
	BaseCommand,
	BaseSubcommand,
	PluginManager,
	QuoteSections,
} from "back-end";
import { logger } from "shared";
import { oneLine } from "common-tags";

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "edit",
			aliases: ["change", "rename"],
			about: "Edits a custom group.",
			usage: `"<old group>" "<[emote] new group>"`,
			examples: oneLine`
			\`{{prefix}}{{id}} edit "Food Stuff" "🍏 Food"\``,
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
			const argsContent = msg.getArgsContent([msg.args[0]]);
			const parse = FramedMessage.getArgs(argsContent, {
				quoteSections: QuoteSections.Flexible,
			});

			// If there's no first or second argument, show help
			if (parse.length < 2) {
				await PluginManager.showHelpForCommand(msg);
				return false;
			}

			const parseFirstArgs = FramedMessage.parseEmojiAndString(parse[0], []);
			const parseSecondArg = FramedMessage.parseEmojiAndString(parse[1], []);

			if (parseFirstArgs && parseSecondArg) {
				const oldGroup = await this.framedClient.databaseManager.findGroup(
					parseFirstArgs.newContent
				);

				if (!oldGroup) {
					await msg.discord?.channel
						.send(oneLine`${msg.discord.author},
					I couldn't find a group with the name "${parseFirstArgs.newContent}"
					to edit. Please make sure that the group exists.`);
					return false;
				}

				const { newContent, newEmote } = parseSecondArg;
				try {
					await this.framedClient.databaseManager.editGroup(
						parseFirstArgs.newContent,
						newContent,
						newEmote
					);
					if (newEmote) {
						await msg.discord?.channel
							.send(oneLine`${msg.discord.author},
						I've renamed the group "${parseFirstArgs.newContent}" into
						"${parseSecondArg.newContent}", and changed the emote to
						"${parseSecondArg.newEmote}" successfully!`);
					} else {
						await msg.discord?.channel
							.send(oneLine`${msg.discord.author},
						I've renamed the group "${parseFirstArgs.newContent}" into
						"${parseSecondArg.newContent}" successfully!`);
					}
				} catch (error) {
					if (error instanceof ReferenceError) {
						await msg.discord?.channel.send(
							`${msg.discord.author}, ${error.message}`
						);
					} else {
						logger.error(error.stack);
					}
					return false;
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
