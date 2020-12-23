import { FramedMessage, PluginManager } from "back-end";
import { BaseCommand } from "back-end";
import { BaseSubcommand } from "back-end";
import { logger } from "shared";
import CustomCommand from "../CustomCommand";

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "delete",
			aliases: ["del", "d", "remove", "rm"],
			about: "Deletes a custom command.",
			examples: `\`{{prefix}}command {{id}} newcommand\``,
			hideUsageInHelp: true,
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		// Checks for permission
		if (!this.hasPermission(msg)) {
			this.sendPermissionErrorMessage(msg);
			return false;
		}

		if (msg.command && msg.args && msg.prefix && msg.args.length > 0) {
			const parse = CustomCommand.customParse(
				msg.prefix,
				msg.command,
				msg.content,
				msg.args
			);
			if (parse) {
				const { newCommandId } = parse;
				await this.deleteCommand(newCommandId, msg);
				return true;
			}
		}

		await PluginManager.showHelpForCommand(msg);
		return false;
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
