import { oneLine, stripIndent } from "common-tags";
import PluginManager from "../../../src/managers/PluginManager";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { BasePlugin } from "../../../src/structures/BasePlugin";
import FramedMessage from "../../../src/structures/FramedMessage";
import path from "path";

export default class CustomCategory extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "group",
			aliases: [
				"category",
				"categories",
				"customcategory",
				"customcategories",
				"grp",
			],
			about: "Lists all the groups available.",
			description: oneLine`
			This command allows you to add, edit, and delete custom groups, shown in \`.help\`.
			See \`.addgrp\`, \`.editgrp\`, and \`.delgrp\`.
			You can also set commands to be in certain groups. See \`.setgrp\`.`,
			usage: `<add|edit|set|delete> "<group>" "<group|command>"`,
			examples: stripIndent`
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
				subcommands: path.join(__dirname, "custom-group"),
			},
			hideUsageInHelp: true,
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			await PluginManager.showHelpForCommand(msg, this.id);
			return true;
		}

		return false;
	}
}
