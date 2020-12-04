import { BasePlugin } from "../../../src/structures/BasePlugin";
import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { oneLine, stripIndent } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "setstreak",
			about: "Set the streak of a user.",
			description: oneLine`
			Set the streak of a user.
			The user parameter can be a mention or user ID.
			The number is the streak amount.
			The today parameters sets the last post time should to today, rather than yesterday.
			`,
			usage: `<user> <number> [today]`,
			examples: stripIndent`
			\`{{prefix}}setstreak @Gman1cus 14 today\`
			\`{{prefix}}setstreak @Gman1cus 14\`
			\`{{prefix}}setstreak\` 474802647602561056 16\`
			`,
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
