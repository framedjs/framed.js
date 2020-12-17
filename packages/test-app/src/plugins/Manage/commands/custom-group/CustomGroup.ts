/* eslint-disable no-mixed-spaces-and-tabs */
import { oneLine, stripIndent } from "common-tags";
import {
	PluginManager,
	BaseCommand,
	BasePlugin,
	FramedMessage,
} from "back-end";
import path from "path";
import Emoji from "node-emoji";

export default class CustomGroup extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "group",
			aliases: ["grp", "category", "customcategory"],
			about: "Lists all the groups available.",
			description: oneLine`
			This command allows you to add, edit, delete, and list custom groups.
			These groups are shown with commands in them, which can be set with this command.`,
			usage: `<add|edit|delete|set|list> "<group|command>" "<group>"`,
			examples: stripIndent`
			\`{{prefix}}group list\`
			\`{{prefix}}group add "🍎 Food Stuff"\`
			\`{{prefix}}group set "Food Stuff" newcommand\`
			\`{{prefix}}group edit "Food Stuff" "🍏 Food"\`
			\`{{prefix}}group delete Food\``,
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
			await PluginManager.showHelpForCommand(msg);
			return true;
		}

		return false;
	}
}
