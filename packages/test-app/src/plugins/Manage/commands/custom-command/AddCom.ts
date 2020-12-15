/* eslint-disable no-mixed-spaces-and-tabs */
import { FramedMessage, BaseCommand, BasePlugin } from "back-end";
import { stripIndent } from "common-tags";
import { logger } from "shared";

export default class CustomCommand extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "addcom",
			aliases: ["addcommand", "createcom", "createcommand"],
			about: "Adds custom commands.",
			description:
				"Adds custom commmands. This is an alias of `.command add`.",
			usage: `<command ID> <content> "[description]"`,
			examples: stripIndent`
			\`{{prefix}}addcom newcommand This is a test message.\``,
			hideUsageInHelp: true,
		});
	}

	/**
	 * Default run command
	 * @param msg FramedMessage object
	 */
	async run(msg: FramedMessage): Promise<boolean> {
		let newContent = msg.content.replace(`addcom`, `command add `);
		const commandPrefix = this.plugin.commands.get("command")
			?.defaultPrefix;

		if (msg.prefix && msg.command) {
			newContent = newContent.replace(
				msg.prefix,
				commandPrefix ? commandPrefix : this.defaultPrefix
			);

			const parse = msg.content
				.replace(msg.prefix, "")
				.replace(msg.command, "");

			logger.debug(`newContent.trim(): "${newContent.trim()}"`);

			// If there's content after the command, run the proper command
			// Else, run the help command
			if (parse.trim().length > 0) {
				await this.framedClient.pluginManager.runCommand(
					new FramedMessage({
						framedClient: this.framedClient,
						content: newContent,
						discord: {
							base: msg,
						},
					})
				);
			} else {
				const helpPrefix = this.plugin.commands.get("help")
					?.defaultPrefix;
				await this.framedClient.pluginManager.runCommand(
					new FramedMessage({
						framedClient: this.framedClient,
						content: `${
							helpPrefix ? helpPrefix : this.defaultPrefix
						}help ${this.id}`,
						discord: {
							base: msg,
						},
					})
				);
			}

			return true;
		}

		return false;
	}
}
