import { BasePlugin } from "../../../src/structures/BasePlugin";
import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "template",
			about: "Not a real command.",
			usage: "Instead, you should copy me!",
			emojiIcon: "🥞",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			// Do things!
			// await msg.discord.channel.send("test"); // Uncomment me!
			return true;
		}
		return false;
	}
}
