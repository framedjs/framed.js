import { BaseCommand } from "../structures/BaseCommand";
import { BaseSubcommand } from "../structures/BaseSubcommand";

export interface FramedFoundCommandData {
	command: BaseCommand;
	subcommands: BaseSubcommand[];
}
