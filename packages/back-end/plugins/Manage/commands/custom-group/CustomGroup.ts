import { oneLine, stripIndent } from "common-tags";
import PluginManager from "../../../../src/managers/PluginManager";
import { BaseCommand } from "../../../../src/structures/BaseCommand";
import { BasePlugin } from "../../../../src/structures/BasePlugin";
import FramedMessage from "../../../../src/structures/FramedMessage";
import path from "path";
import Emoji from "node-emoji";

export default class CustomGroup extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "group",
			aliases: [
				"groups",
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
			usage: `<add|edit|set|delete> "<group|command>" "<group>"`,
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

	static parseEmojiAndGroup(
		msg: FramedMessage | string,
		parseOut: string[]
	):
		| {
				newContent: string;
				newEmote?: string;
		  }
		| undefined {

		let argsContent: string;
		if (msg instanceof FramedMessage) {
			argsContent = msg.getArgsContent([...parseOut]);
			if (argsContent[0] == `"`) {
				argsContent = argsContent.substring(1, argsContent.length);
			}
			if (
				argsContent[argsContent.length - 1] == `"` &&
				argsContent[argsContent.length - 2] != "\\"
			) {
				argsContent = argsContent.substring(0, argsContent.length - 1);
			}
		} else {
			argsContent = msg;
		}

		if (!argsContent) return;

		const newArgs = FramedMessage.getArgs(argsContent);

		// https://stackoverflow.com/questions/62955907/discordjs-nodejs-how-can-i-check-if-a-message-only-contains-custom-emotes#62960102
		const regex = /(:[^:\s]+:|<:[^:\s]+:[0-9]+>|<a:[^:\s]+:[0-9]+>)/g;
		const markdownEmote = newArgs[0].match(regex);

		const genericEmoji =
			newArgs.length > 0 ? Emoji.find(newArgs[0])?.emoji : undefined;

		const newEmote = markdownEmote ? markdownEmote[0] : genericEmoji;
		const newContent = newEmote
			? argsContent.replace(newEmote, "").trimLeft()
			: argsContent;

		// If there is going to be content, return what we got
		if (newContent.length != 0) {
			return {
				newContent,
				newEmote,
			};
		}
	}
}
