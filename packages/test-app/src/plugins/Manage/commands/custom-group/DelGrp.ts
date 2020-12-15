/* eslint-disable no-mixed-spaces-and-tabs */
import {
	PluginManager,
	BaseCommand,
	BasePlugin,
	FramedMessage,
} from "back-end";
import { oneLine } from "common-tags";

const replacement = `group delete`;

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "delgrp",
			aliases: ["delgroup", "remgrp", "removegroup"],
			about: `Deletes a custom group. This is an alias of \`${plugin.defaultPrefix}${replacement}\`.`,
			usage: `"<group>"`,
			examples: oneLine`
			\`{{prefix}}group delete "Food"\``,
			hideUsageInHelp: true,
		});
	}

	/**
	 * Default run command
	 * @param msg FramedMessage object
	 */
	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.prefix && msg.command) {
			let newContent = msg.content.replace(msg.command, `${replacement} `);
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
