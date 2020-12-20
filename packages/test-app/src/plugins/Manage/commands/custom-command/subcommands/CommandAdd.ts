import { Command, FramedMessage, PluginManager } from "back-end";
import { BaseCommand } from "back-end";
import { BaseSubcommand } from "back-end";
import CustomCommand from "../CustomCommand";

export default class CustomCommandAdd extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "add",
			aliases: ["a", "create", "cr"],
			about: "Adds a custom command.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		// Checks for permission
		if (!this.hasPermission(msg, this.permissions)) {
			this.sendPermissionErrorMessage(msg);
			return false;
		}

		if (msg.args && msg.args.length > 0) {
			
		}

		return false;
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
}
