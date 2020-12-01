import { CommandInfo } from "../interfaces/CommandInfo";
import { BaseCommand } from "./BaseCommand";

export default abstract class BaseSubcommand extends BaseCommand {
	/**
	 * Base command
	 */
	baseCommand: BaseCommand;

	constructor(command: BaseCommand, info: CommandInfo) {
		super(command.plugin, command.info);

		// this.id = `${this.id}.${info.id}`;
		this.fullId = `${this.fullId}.${info.id}`;

		this.baseCommand = command;
	}
}
