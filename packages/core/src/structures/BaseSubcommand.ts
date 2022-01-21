import { BaseCommandOptions } from "../interfaces/BaseCommandOptions";
import { BaseCommand } from "./BaseCommand";
import { ImportError } from "./errors/non-friendly/ImportError";

export abstract class BaseSubcommand extends BaseCommand {
	/**
	 * Base command
	 */
	baseCommand: BaseCommand;

	constructor(command: BaseCommand, info: BaseCommandOptions) {
		// Require-All was used;
		if (!(command instanceof BaseCommand)) {
			throw new ImportError(
				"command wasn't an instanceof BaseCommand, likely due to the command importing a subcommand."
			);
		}

		super(command.plugin, command.rawInfo);

		this.id = `${info.id}`;
		this.fullId = `${this.fullId}.${info.id}`;
		this.aliases = info.aliases;

		this.baseCommand = command;

		this.about = info.about;
		this.description = info.description;
		this.usage = info.usage;
		this.examples = info.examples;
		this.notes = info.notes;
		this.hideUsageInHelp = info.hideUsageInHelp;
		this.userPermissions = info.userPermissions ?? command.userPermissions;

		this.inline = info.inline ? info.inline : false;

		this.rawInfo = info;

		this.cooldown = info.cooldown ?? command.cooldown;
		this.botPermissions = info.botPermissions ?? command.botPermissions;
	}
}
