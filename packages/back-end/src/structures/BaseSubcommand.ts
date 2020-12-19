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

		this.about = this.parseBasicFormatting(info.about);
		this.description = this.parseBasicFormatting(info.description);
		this.usage = this.parseBasicFormatting(info.usage);

		this.examples = this.parseBasicFormatting(info.examples);
		this.hideUsageInHelp = info.hideUsageInHelp;
		this.permissions = info.permissions;
		this.inlineCharacterLimit = info.inlineCharacterLimit;

		this.inline = info.inline ? info.inline : false;
		this.inlineAliases = info.inlineAliases ? info.inlineAliases : false;
	}
}
