import { BaseCommand, BasePlugin, FramedMessage } from "back-end";
import { oneLine, stripIndent } from "common-tags";
import path from "path";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "streaks",
			aliases: ["streak", "s"],
			about: "View your or a users' streaks.",
			description: oneLine`
			View your or a users' streaks.
			To view the top three users' streaks, use \`$(command ${plugin.id} {{id}} top)\`.
			To view all the users' streaks, use \`$(command ${plugin.id} {{id}} all)\`.`,
			usage: `[@user|id]`,
			examples: stripIndent`
			\`{{prefix}}{{id}}\`
			\`{{prefix}}{{id}} @Gman1cus\`
			\`{{prefix}}{{id}} 474802647602561056\``,
			paths: {
				subcommands: path.join(__dirname, "subcommands"),
			},
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			// This has been intentionally left blank, since a
			// separate bot writtern in Python handles this, instead.
			return true;
		}
		return false;
	}
}
