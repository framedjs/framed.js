import { BaseDiscordSlashSubcommandOptions } from "../interfaces/BaseDiscordSlashSubcommandOptions";
import { BaseCommand } from "./BaseCommand";
import { BaseSubcommand } from "./BaseSubcommand";
import { ImportError } from "./errors/non-friendly/ImportError";

export abstract class BaseDiscordSlashSubcommand extends BaseSubcommand {
	constructor(command: BaseCommand, info: BaseDiscordSlashSubcommandOptions) {
		// Require-All was used;
		if (!(command instanceof BaseCommand)) {
			throw new ImportError(
				"command wasn't an instanceof BaseCommand, likely due to the command importing a subcommand."
			);
		}

		super(command, info);
	}
}
