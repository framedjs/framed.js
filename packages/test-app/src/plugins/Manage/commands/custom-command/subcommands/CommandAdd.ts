import { Command, FramedMessage, PluginManager } from "back-end";
import { BaseCommand } from "back-end";
import { BaseSubcommand } from "back-end";
import { stripIndents } from "common-tags";
import { logger } from "shared";
import CustomCommand from "../CustomCommand";

export default class extends BaseSubcommand {
	constructor(command: BaseCommand) {
		super(command, {
			id: "add",
			aliases: ["a", "create", "cr"],
			about: "Adds a custom command.",
			examples: stripIndents`
			\`{{prefix}}command {{id}} newcommand This is a test message.\`
			\`{{prefix}}command {{id}} newcommand Test message! "Test description!"\`
			`,
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
				const { newCommandId, newArgs } = parse;
				return (
					(await this.addCommand(newCommandId, newArgs, msg)) !=
					undefined
				);
			}
		}

		await PluginManager.sendHelpForCommand(msg);
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
		const connection = this.framedClient.database.connection;
		if (!connection) {
			logger.error("No connection to a database found!");
			return undefined;
		}

		const parse = await CustomCommand.customParseCommand(
			this.framedClient.database,
			newCommandId,
			newContents,
			msg
		);

		// If the user didn't enter the command right, show help
		if (!parse) {
			if (msg && !silent) {
				await PluginManager.sendHelpForCommand(msg);
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
		const defaultGroup = await this.framedClient.database.getDefaultGroup();
		try {
			command = commandRepo.create({
				id: newCommandId.toLocaleLowerCase(),
				response: response,
				group: defaultGroup,
				defaultPrefix: prefix,
				prefixes: [prefix],
			});

			command = await commandRepo.save(command);
		} catch (error) {
			try {
				await this.framedClient.database.deleteResponse(
					response.id
				);
			} catch (error) {
				logger.error(`Failed to delete response\n${error.stack}`);
			}
			logger.error(`Failed to add command\n${error.stack}`);
			return undefined;
		}

		// If the command was valid, and (probably) didn't error out
		if (command) {
			if (msg?.discord) {
				await msg.discord.channel.send(
					`${msg.discord.author}, I've added the \`${prefix.prefix}${command.id}\` command.`
				);
			}
		}
		return command;
	}
}
