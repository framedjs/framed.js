/* eslint-disable no-mixed-spaces-and-tabs */
import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { BasePlugin } from "../../../src/structures/BasePlugin";
import { stripIndent } from "common-tags";

export default class CustomCommand extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "editcom",
			aliases: ["changecom"],
			about: "Edits custom commands.",
			description:
				"Edits custom commands. This is an alias of `.command edit`.",
			usage: `<command ID> <content> "[description]"`,
			examples: stripIndent`
			\`{{prefix}}editcom newcommand This is an edited command message!\``,
			emojiIcon: "🔸",
			hideUsageInHelp: true,
		});
	}

	/**
	 * Default run command
	 * @param msg FramedMessage object
	 */
	async run(msg: FramedMessage): Promise<boolean> {
		let newContent = msg.content.replace(`editcom`, `command edit `);
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

			console.log(`newContent.trim(): "${newContent.trim()}"`);

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
