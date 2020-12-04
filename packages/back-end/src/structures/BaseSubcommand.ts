import { CommandInfo } from "../interfaces/CommandInfo";
import { BaseCommand } from "./BaseCommand";

export default abstract class BaseSubcommand extends BaseCommand {
	/**
	 * Base command
	 */
	baseCommand: BaseCommand;

	constructor(command: BaseCommand, info: CommandInfo) {
		super(command.plugin, command.rawInfo);

		this.id = `${info.id}`;
		this.fullId = `${this.fullId}.${info.id}`;
		this.aliases = info.aliases;

		this.baseCommand = command;
		
		this.about = info.about;
		this.description = info.description;
		this.usage = info.usage;
		this.hideUsageInHelp = info.hideUsageInHelp;
		this.examples = info.examples;
		this.permissions = info.permissions;
		this.inlineCharacterLimit = info.inlineCharacterLimit;

		if (this.examples) {
			this.examples = this.examples?.replace(
				/{{prefix}}/gi,
				this.defaultPrefix
			);
		}

		this.inline = info.inline ? info.inline : false;
		this.inlineAliases = info.inlineAliases ? info.inlineAliases : false;
	}
}
