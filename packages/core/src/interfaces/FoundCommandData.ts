import { BaseCommand } from "../structures/BaseCommand";
import { BaseSubcommand } from "../structures/BaseSubcommand";

export interface FoundCommandData {
	command: BaseCommand;
	subcommands: BaseSubcommand[];
}
