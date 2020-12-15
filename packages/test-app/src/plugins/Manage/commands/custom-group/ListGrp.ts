/* eslint-disable no-mixed-spaces-and-tabs */
import {
	BaseCommand,
	BasePlugin,
	FramedMessage,
} from "back-end";
const replacement = `group list`;

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "listgrp",
			aliases: [
				"showgrp",
				"showgroup",
				"showgroups",
				"groups",
				"categories",
				"customcategories",
			],
			about: `Lists all custom groups. This is an alias of \`${plugin.defaultPrefix}${replacement}\`.`,
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

			await this.framedClient.pluginManager.runCommand(
				new FramedMessage({
					framedClient: this.framedClient,
					content: newContent,
					discord: {
						base: msg,
					},
				})
			);

			return true;
		}

		return false;
	}
}
