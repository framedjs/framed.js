import {
	FramedMessage,
	QuoteSections,
	BaseCommand,
	BaseSubcommand,
	PluginManager,
} from "back-end";
import { logger } from "shared";
import { oneLine } from "common-tags";

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "set",
			about: "Sets a custom command to a group.",
			usage: `<command> "<group>"`,
			examples: oneLine`
			\`{{prefix}}group {{id}} newcommand "Food Stuff"\``,
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

			const parseFirstArgs = parse[0];
			const parseSecondArg = FramedMessage.parseEmojiAndString(parse[1], []);

			if (parseFirstArgs && parseSecondArg) {
				const command = this.framedClient.databaseManager.findCommand(
					parseFirstArgs,
					this.defaultPrefix
				);

				if (!command) {
					await msg.discord?.channel
						.send(oneLine`${msg.discord.author},
					I couldn't find a command with the name "${parseFirstArgs}"
					to edit. Please make sure that the command exists.`);
					return false;
				}

				if (!parseSecondArg) {
					await msg.discord?.channel
						.send(oneLine`${msg.discord.author},
					I couldn't find a group with the name "${parse[1]}"
					to edit. Please make sure that the group exists.`);
					return false;
				}

				const { newContent } = parseSecondArg;
				try {
					await this.framedClient.databaseManager.setGroup(
						parseFirstArgs,
						newContent
					);
					await msg.discord?.channel
						.send(oneLine`${msg.discord.author},
					I've set the command "${parseFirstArgs}" to group "${newContent}" successfully!`);
				} catch (error) {
					if (error instanceof ReferenceError) {
						await msg.discord?.channel.send(
							`${msg.discord.author}, ${error.message}`
						);
					} else {
						logger.error(error);
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
