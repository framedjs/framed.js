import { BaseCommandOptions } from "../interfaces/BaseCommandOptions";
import { BaseCommand } from "./BaseCommand";

export abstract class BaseSubcommand extends BaseCommand {
	// static readonly type: string = "BaseSubcommand";

	/**
	 * Base command
	 */
	baseCommand: BaseCommand;

	constructor(command: BaseCommand, info: BaseCommandOptions) {
		super(command.plugin, command.rawInfo);

		this.id = `${info.id}`;
		this.fullId = `${this.fullId}.${info.id}`;
		this.aliases = info.aliases;

		this.baseCommand = command;

		this.about = info.about;
		this.description = info.description;
		this.usage = info.usage;
		this.examples = info.examples;

		this.hideUsageInHelp = info.hideUsageInHelp;
		this.permissions = info.permissions;

		this.inline = info.inline ? info.inline : false;
	}
}
