import { BaseCommandOptions } from "../interfaces/BaseCommandOptions";
import { BaseCommand } from "./BaseCommand";
import { BasePlugin } from "./BasePlugin";
import { ImportError } from "./errors/non-friendly/ImportError";

export abstract class BaseSubcommand extends BaseCommand {
	// static readonly type: string = "BaseSubcommand";

	/**
	 * Base command
	 */
	baseCommand: BaseCommand;

	constructor(command: BaseCommand, info: BaseCommandOptions) {
		// Require-All was used;
		if (command instanceof BasePlugin) {
			throw new ImportError(
				"command was an instance of BasePlugin, likely due to the command importing a subcommand."
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

		this.hideUsageInHelp = info.hideUsageInHelp;
		this.permissions = info.permissions;

		this.inline = info.inline ? info.inline : false;
	}
}
