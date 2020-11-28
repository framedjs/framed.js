import { BasePlugin } from "../../../src/structures/BasePlugin";
import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "discohook",
			about: "Creates JSON data usable in Discohook.",
			usage: "<message ID | message link | message>",
			emojiIcon: "⚓",
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
