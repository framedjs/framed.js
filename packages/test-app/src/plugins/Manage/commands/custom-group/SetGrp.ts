/* eslint-disable no-mixed-spaces-and-tabs */
import FramedMessage from "back-end/src/structures/FramedMessage";
import { BaseCommand } from "back-end/src/structures/BaseCommand";
import { BasePlugin } from "back-end/src/structures/BasePlugin";
import PluginManager from "back-end/src/managers/PluginManager";
import { oneLine } from "common-tags";

const replacement = `group set`;

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "setgrp",
			about: oneLine`Sets a custom command to a group.
			This is an alias of \`${plugin.defaultPrefix}${replacement}\`.`,
			usage: `<command> "<group>"`,
			examples: oneLine`
			\`{{prefix}}group set newcommand "Food Stuff"\``,
			hideUsageInHelp: true,
		});
	}

	/**
	 * Default run command
	 * @param msg FramedMessage object
	 */
	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.prefix && msg.command) {
			let newContent = msg.content.replace(
				msg.command,
				`${replacement} `
			);
			const commandPrefix = this.plugin.commands.get("group")
				?.defaultPrefix;

			newContent = newContent.replace(
				msg.prefix,
				commandPrefix ? commandPrefix : this.defaultPrefix
			);

			const parse = msg.getArgsContent();

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
				PluginManager.showHelpForCommand(msg);
			}

			return true;
		}

		return false;
	}
}
