import FramedMessage from "../../../src/structures/FramedMessage";
import { BaseCommand } from "../../../src/structures/BaseCommand";
import { BasePlugin } from "packages/back-end/src/structures/BasePlugin";

export default class extends BaseCommand {
	constructor(plugin: BasePlugin) {
		super(plugin, {
			id: "test",
			name: "Test Command",
			about: "A test command.",
		});
	}

	async run(msg: FramedMessage): Promise<boolean> {
		if (msg.discord) {
			await msg.discord.channel.send("test");
			return true;
		}
		return false;
	}
}
