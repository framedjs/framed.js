import { BasePlugin } from "back-end/src/structures/BasePlugin";
import FramedMessage from "back-end/src/structures/FramedMessage";
import { BaseCommand } from "back-end/src/structures/BaseCommand";
import { oneLine, stripIndent } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "streaks",
			aliases: ["streak", "s"],
			about: "Shows streak stats for users.",
			description: oneLine`
			Shows streak stats for users.`,
			usage: `[top|all|userid]`,
			hideUsageInHelp: true,
			examples: stripIndent`
			\`{{prefix}}streaks\`
			\`{{prefix}}streaks top\`
			\`{{prefix}}streaks all\`
			\`{{prefix}}streaks 359521958519504926\``,
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			// This has been intentionally left blank, since a
			// separate bot written in Python handles this, instead.
			return true;
		}
		return false;
	}
}
