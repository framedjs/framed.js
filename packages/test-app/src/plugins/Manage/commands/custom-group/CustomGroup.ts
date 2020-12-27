/* eslint-disable no-mixed-spaces-and-tabs */
import { oneLine, stripIndent } from "common-tags";
import {
	PluginManager,
	BaseCommand,
	BasePlugin,
	FramedMessage,
} from "back-end";
import path from "path";

export default class CustomGroup extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "group",
			aliases: ["groups", "grp", "category", "customcategory"],
			about: "Manages groups.",
			description: oneLine`
			Add, edit, delete, and list custom groups.
			These groups are shown with commands in them, which can be set with this command.`,
			usage: `<add|edit|delete|set|list> "<group|command>" "<group>"`,
			examples: stripIndent`
			\`{{prefix}}{{id}} list\`
			\`{{prefix}}{{id}} add "🍎 Food Stuff"\`
			\`{{prefix}}{{id}} set "Food Stuff" newcommand\`
			\`{{prefix}}{{id}} edit "Food Stuff" "🍏 Food"\`
			\`{{prefix}}{{id}} delete Food\``,
			permissions: {
				discord: {
					permissions: ["MANAGE_MESSAGES"],
					// Mods, Community Manager
					roles: ["462342299171684364", "758771336289583125"],
				},
			},
			paths: {
				subcommands: path.join(__dirname, "subcommands"),
			},
			hideUsageInHelp: true,
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			await PluginManager.sendHelpForCommand(msg);
			return true;
		}

		return false;
	}
}
