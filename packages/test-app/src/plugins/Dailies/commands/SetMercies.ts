import { BaseCommand, BasePlugin, FramedMessage } from "back-end";
import { oneLine, stripIndent } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "setmercies",
			about: "Set the mercies of a user.",
			description: oneLine`
			Set the mercies of a user.
			The user parameter can be a mention or user ID.
			The number is the mercies amount.
			`,
			usage: `<user> <number>`,
			examples: stripIndent`
			\`{{prefix}}{{id}} @Gman1cus 4\` 
			\`{{prefix}}{{id}} 474802647602561056 6\`
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
