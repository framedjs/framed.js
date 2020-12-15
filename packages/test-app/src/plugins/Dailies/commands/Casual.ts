import { BaseCommand, BasePlugin, FramedMessage } from "back-end";
import { oneLine, stripIndent } from "common-tags";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "casual",
			about: "Toggles casual mode.",
			description: oneLine`
			Casual mode allows you to be a streaker without the threat of losing your streak.
			Your streak will instead be based on a weekly/monthly total, resetting every month.` 
			+ `\n\n${stripIndent`
			:warning: **WARNING** - Toggling this mode will **reset your streak and mercy days to 0.**`}`,
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
